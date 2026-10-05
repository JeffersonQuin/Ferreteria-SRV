<script setup lang="ts">
import HistorialDetalleModal from '~/components/ventas/HistorialDetalleModal.vue'
import HistorialPagoModal from '~/components/ventas/HistorialPagoModal.vue'
import HistorialResumenDiaModal from '~/components/ventas/HistorialResumenDiaModal.vue'
import HistorialResumenPorDiaReporte from '~/components/ventas/HistorialResumenPorDiaReporte.vue'
import HistorialVentaComprobante from '~/components/ventas/HistorialVentaComprobante.vue'
import HistorialVentasReporte from '~/components/ventas/HistorialVentasReporte.vue'
import type { HistorialVenta, HistorialVentaDetalle } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Historial de Ventas - Ferretería SRV' })

const {
  ventas,
  totalCount,
  page,
  pageSize,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  busquedaCliente,
  estadoFiltro,
  fechaDesde,
  fechaHasta,
  errorFecha,
  loading,
  error,
  detalle,
  detalleLoading,
  detalleError,
  detalleAdvertencia,
  editing,
  editError,
  paying,
  pagoError,
  exporting,
  exportError,
  reporte,
  fetchVentas,
  goToPage,
  loadDetail,
  clearDetail,
  editarVenta,
  clearEditError,
  limpiarFiltrosFecha,
  completePayment,
  clearPaymentState,
  loadReport,
  clearReport,
  resumenDia,
  resumenDiaLoading,
  resumenDiaError,
  loadResumenDia
} = useHistorialVentas()

// ── Resumen por día (Spec 017) ──────────────────────────────────────────────
const {
  resumenPorDia,
  loading: loadingResumenPorDia,
  error: errorResumenPorDia,
  loadResumenPorDia,
  clearResumenPorDia
} = useResumenPorDia()
// ────────────────────────────────────────────────────────────────────────────

const showDetailModal = ref(false)
const showPaymentModal = ref(false)
const showResumenDiaModal = ref(false)
const selectedDetailVenta = shallowRef<HistorialVenta | null>(null)
const selectedPaymentVenta = shallowRef<HistorialVenta | null>(null)
const printReceipt = shallowRef<HistorialVentaDetalle | null>(null)
const printMode = ref<'receipt' | 'report' | 'resumen-por-dia' | null>(null)
const printing = ref(false)
const printError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const firstVisible = computed(() => totalCount.value === 0 ? 0 : (page.value - 1) * pageSize + 1)
const lastVisible = computed(() => Math.min(page.value * pageSize, totalCount.value))
const actionsDisabled = computed(() => loading.value || paying.value || exporting.value || printing.value || editing.value || loadingResumenPorDia.value)

// Opciones del filtro de estado (mismos valores que usaba el selector).
const opcionesEstado = ['Todos', 'Completo', 'Pendiente', 'No pagado'] as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

function badgeClass(estado: string) {
  if (estado === 'Completo') return 'bg-green-100 text-green-800'
  if (estado === 'Pendiente') return 'bg-amber-100 text-amber-900'
  return 'bg-red-100 text-red-800'
}

// ── Detalle ──────────────────────────────────────────────────────────────────
async function openDetail(venta: HistorialVenta) {
  selectedDetailVenta.value = venta
  showDetailModal.value = true
  clearEditError()
  await loadDetail(venta)
}

async function retryDetail() {
  if (selectedDetailVenta.value) await loadDetail(selectedDetailVenta.value, true)
}

function closeDetail() {
  if (editing.value) return
  showDetailModal.value = false
  selectedDetailVenta.value = null
  clearDetail()
  clearEditError()
}

// ── Edición de venta (Corrección 1 - Spec 012) ───────────────────────────────
async function onGuardarEdicion(itemsAEliminar: number[]) {
  if (!selectedDetailVenta.value || !detalle.value) return

  const ventaActualizada = await editarVenta(selectedDetailVenta.value.id, itemsAEliminar)
  if (!ventaActualizada) return // editError ya fue seteado en el composable

  // Recargar detalle desde BD con los ítems actualizados
  await loadDetail(ventaActualizada, true)
  // Actualizar la referencia local de la venta seleccionada
  selectedDetailVenta.value = ventaActualizada
  successMessage.value = `Venta N.º ${ventaActualizada.id} actualizada correctamente.`
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Pago ─────────────────────────────────────────────────────────────────────
function openPayment(venta: HistorialVenta) {
  clearPaymentState()
  selectedPaymentVenta.value = venta
  showPaymentModal.value = true
}

function closePayment() {
  if (paying.value) return
  showPaymentModal.value = false
  selectedPaymentVenta.value = null
  clearPaymentState()
}

async function confirmPayment(monto: string) {
  if (!selectedPaymentVenta.value) return
  const paidVenta = await completePayment(selectedPaymentVenta.value, monto)
  if (!paidVenta) return

  showPaymentModal.value = false
  selectedPaymentVenta.value = null
  successMessage.value = `Pago de la venta N.º ${paidVenta.venta.id} completado correctamente.`
  clearPaymentState()
}

// ── Impresión ─────────────────────────────────────────────────────────────────
async function invokePrint() {
  await nextTick()
  if (typeof window === 'undefined' || typeof window.print !== 'function') {
    throw new Error('La impresión no está disponible en este navegador.')
  }
  // Vaciamos el título para que el navegador no lo muestre en el encabezado impreso
  const prevTitle = document.title
  document.title = ''
  try {
    window.print()
  } finally {
    // Restauramos el título tras abrir el diálogo (setTimeout para que el
    // diálogo ya esté abierto antes de restaurar)
    setTimeout(() => { document.title = prevTitle }, 500)
  }
}

async function printSale(venta: HistorialVenta) {
  if (actionsDisabled.value) return
  printing.value = true
  printError.value = null
  printReceipt.value = null

  try {
    const loaded = await loadDetail(venta)
    if (!loaded) throw new Error(detalleError.value || 'No fue posible preparar el comprobante histórico.')

    printReceipt.value = {
      venta: { ...loaded.venta },
      items: loaded.items.map(item => ({ ...item })),
      totalItemsCentavos: loaded.totalItemsCentavos,
      tieneInconsistencia: loaded.tieneInconsistencia
    }
    printMode.value = 'receipt'
    await invokePrint()
  } catch (cause) {
    console.error('[HistorialVentas] No fue posible imprimir la venta', cause)
    printError.value = cause instanceof Error ? cause.message : 'No fue posible abrir la impresión.'
  } finally {
    printMode.value = null
    printReceipt.value = null
    printing.value = false
  }
}

async function exportPdf() {
  if (actionsDisabled.value || totalCount.value === 0) return
  printing.value = true
  printError.value = null
  clearReport()

  try {
    const loaded = await loadReport()
    if (!loaded) throw new Error(exportError.value || 'No fue posible preparar el reporte.')
    printMode.value = 'report'
    await invokePrint()
  } catch (cause) {
    console.error('[HistorialVentas] No fue posible imprimir el reporte', cause)
    printError.value = cause instanceof Error ? cause.message : 'No fue posible abrir la impresión del reporte.'
  } finally {
    printMode.value = null
    printing.value = false
    clearReport()
  }
}

// ── Informe de ventas por día (Spec 017) ────────────────────────────────────
async function exportResumenPorDia() {
  if (actionsDisabled.value) return
  printing.value = true
  printError.value = null
  clearResumenPorDia()

  try {
    const loaded = await loadResumenPorDia()
    if (!loaded) throw new Error(errorResumenPorDia.value || 'No fue posible preparar el resumen por día.')
    printMode.value = 'resumen-por-dia'
    await invokePrint()
  } catch (cause) {
    console.error('[HistorialVentas] No fue posible imprimir el resumen por día', cause)
    printError.value = cause instanceof Error ? cause.message : 'No fue posible abrir la impresión del resumen por día.'
  } finally {
    printMode.value = null
    printing.value = false
    clearResumenPorDia()
  }
}
// ────────────────────────────────────────────────────────────────────────────

onMounted(fetchVentas)
</script>

<template>
  <section aria-labelledby="historial-title" class="no-print min-w-0">
    <VolverDashboard
      titulo="Historial de ventas"
      titulo-id="historial-title"
      descripcion="Consulta, imprime y exporta tus ventas."
      tono="oliva"
    >
      <template #icon>
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5M12 7v5l3 2" />
        </svg>
      </template>
    </VolverDashboard>

    <!-- Acciones de reporte -->
    <div class="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      <button
        type="button"
        class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#505E26] bg-white px-3 text-sm font-semibold text-[#3F4A1E] hover:bg-[#EEF1E0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7A3A] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="actionsDisabled"
        @click="showResumenDiaModal = true"
      >
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
        Resumen del día
      </button>
      <button
        type="button"
        class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#505E26] bg-white px-3 text-sm font-semibold text-[#3F4A1E] hover:bg-[#EEF1E0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7A3A] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="actionsDisabled || loadingResumenPorDia"
        @click="exportResumenPorDia"
      >
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01" />
        </svg>
        {{ loadingResumenPorDia ? 'Preparando...' : printing && printMode === 'resumen-por-dia' ? 'Abriendo...' : 'Informe de ventas' }}
      </button>
      <button
        type="button"
        class="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#6B7A3A] to-[#505E26] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_-8px_rgba(80,94,38,0.7)] hover:from-[#788845] hover:to-[#5A6A2C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#505E26] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:col-span-1"
        :disabled="actionsDisabled || totalCount === 0"
        @click="exportPdf"
      >
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2" />
        </svg>
        {{ exporting ? 'Preparando...' : printing && printMode === 'report' ? 'Abriendo...' : 'Exportar PDF' }}
      </button>
    </div>

    <p v-if="successMessage" role="status" aria-live="polite" class="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">
      <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
      <span>{{ successMessage }}</span>
    </p>
    <p v-if="printError || exportError" role="alert" class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ printError || exportError }}
    </p>

    <!-- ── Filtros ──────────────────────────────────────────────────────────── -->
    <section aria-label="Filtros del historial" class="mb-5 rounded-3xl border border-[#E3CFB4] bg-white p-4 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
      <div>
        <label for="buscar-cliente" class="sr-only">Buscar por cliente</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg class="h-5 w-5 text-[#A9784A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="buscar-cliente"
            v-model="busquedaCliente"
            type="search"
            enterkeyhint="search"
            placeholder="Buscar por nombre de cliente"
            :disabled="actionsDisabled"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white py-3 pl-11 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#505E26] focus:outline-none focus:ring-2 focus:ring-[#6B7A3A]/40 disabled:bg-gray-100 sm:text-sm"
          >
        </div>
      </div>

      <!-- Estado: botones en lugar de lista desplegable -->
      <div class="mt-4">
        <p id="filtro-estado-label" class="mb-2 text-sm font-semibold text-[#4A2418]">Estado</p>
        <div role="radiogroup" aria-labelledby="filtro-estado-label" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            v-for="opcion in opcionesEstado"
            :key="opcion"
            type="button"
            role="radio"
            :aria-checked="estadoFiltro === opcion"
            :disabled="actionsDisabled"
            class="min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7A3A] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            :class="estadoFiltro === opcion
              ? 'border-[#505E26] bg-[#505E26] text-white'
              : 'border-[#CDBFA6] bg-white text-[#4A2418] hover:bg-[#F5F1E4]'"
            @click="estadoFiltro = opcion"
          >
            {{ opcion }}
          </button>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label for="fecha-desde" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Desde</label>
          <input
            id="fecha-desde"
            v-model="fechaDesde"
            type="date"
            :disabled="actionsDisabled"
            :max="fechaHasta || undefined"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-3 py-3 text-base text-gray-900 focus:border-[#505E26] focus:outline-none focus:ring-2 focus:ring-[#6B7A3A]/40 disabled:bg-gray-100 sm:text-sm"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div>
          <label for="fecha-hasta" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Hasta</label>
          <input
            id="fecha-hasta"
            v-model="fechaHasta"
            type="date"
            :disabled="actionsDisabled"
            :min="fechaDesde || undefined"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-3 py-3 text-base text-gray-900 focus:border-[#505E26] focus:outline-none focus:ring-2 focus:ring-[#6B7A3A]/40 disabled:bg-gray-100 sm:text-sm"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div class="col-span-2 flex items-end sm:col-span-1">
          <button
            type="button"
            :disabled="actionsDisabled || (!fechaDesde && !fechaHasta)"
            class="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D4A574] px-4 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50"
            @click="limpiarFiltrosFecha"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Limpiar fechas
          </button>
        </div>
      </div>

      <p v-if="errorFecha" role="alert" class="mt-3 text-sm font-medium text-red-700">{{ errorFecha }}</p>
    </section>

    <!-- ── Cargando ──────────────────────────────────────────────────────────── -->
    <div
      v-if="loading"
      role="status"
      class="flex items-center gap-3 rounded-3xl border border-[#E3CFB4] bg-white p-5 text-sm text-gray-700"
    >
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
      Cargando historial de ventas...
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────────────── -->
    <div v-else-if="error" role="alert" class="rounded-3xl border border-red-200 bg-red-50 p-5">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button
        type="button"
        class="mt-3 min-h-11 rounded-xl bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
        @click="fetchVentas"
      >Reintentar</button>
    </div>

    <!-- ── Sin resultados ────────────────────────────────────────────────────── -->
    <div
      v-else-if="ventas.length === 0"
      class="rounded-3xl border border-[#E3CFB4] bg-white px-5 py-12 text-center shadow-sm"
    >
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF1E0] text-[#505E26]">
        <svg class="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path d="M3 3v18h18" /><path d="m7 16 4-4 3 3 5-7" />
        </svg>
      </span>
      <h2 class="mt-3 font-bold text-[#3A1C12]">No se encontraron ventas</h2>
      <p class="mt-1 text-sm text-[#5C4033]">Prueba con otro nombre de cliente, estado o rango de fechas.</p>
    </div>

    <template v-else>
      <!-- ── Tabla (pantallas grandes) ───────────────────────────────────────── -->
      <div class="hidden overflow-x-auto rounded-3xl border border-[#E3CFB4] bg-white shadow-sm lg:block">
        <table class="min-w-[860px] w-full border-collapse text-sm">
          <thead class="bg-[#F5E6D3] text-left text-xs uppercase tracking-wide text-[#6B3A2A]">
            <tr>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Cliente</th>
              <th class="px-4 py-3 text-right">Total</th>
              <th class="px-4 py-3 text-right">Ganancia</th>
              <th class="px-4 py-3 text-center">Estado</th>
              <th class="px-4 py-3 text-center">Opciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D4A574]/50">
            <tr v-for="venta in ventas" :key="venta.id" class="hover:bg-[#F5E6D3]/35">
              <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ formatDate(venta.fecha) }}</td>
              <td class="px-4 py-3 font-medium text-gray-900">{{ venta.clienteNombre }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{{ formatBs(venta.totalCentavos) }}</td>
              <td
                class="whitespace-nowrap px-4 py-3 text-right font-semibold"
                :class="venta.gananciaTotalCentavos < 0 ? 'text-amber-700' : 'text-green-700'"
              >{{ formatBs(venta.gananciaTotalCentavos) }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" :class="badgeClass(venta.estado)">
                  {{ venta.estado }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50"
                    :aria-label="`Ver detalle de venta ${venta.id}`"
                    title="Ver Detalle"
                    @click="openDetail(venta)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50"
                    :aria-label="`Imprimir factura de venta ${venta.id}`"
                    title="Imprimir Factura"
                    @click="printSale(venta)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <path d="M6 14h12v8H6z" />
                    </svg>
                  </button>
                  <button
                    v-if="venta.estado !== 'Completo'"
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-green-700 hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:opacity-50"
                    :aria-label="`Completar pago de venta ${venta.id}`"
                    title="Completar Pago"
                    @click="openPayment(venta)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M6 12h.01M18 12h.01M9 12h6" />
                      <path d="m15 4 2 2 4-4" />
                    </svg>
                  </button>
                  <VentasEliminarVentaBoton
                    :venta="venta"
                    :disabled="actionsDisabled"
                    @deleted="(id: number) => { successMessage = `Venta N.º ${id} eliminada correctamente.`; fetchVentas() }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Tarjetas (celular y tablet) ─────────────────────────────────────── -->
      <ul class="space-y-3 lg:hidden">
        <li
          v-for="venta in ventas"
          :key="venta.id"
          class="rounded-3xl border border-[#E3CFB4] bg-white p-4 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_10px_20px_-14px_rgba(74,36,24,0.35)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="break-words font-semibold leading-tight text-[#3A1C12]">{{ venta.clienteNombre }}</h2>
              <p class="mt-0.5 text-sm text-[#5C4033]">{{ formatDate(venta.fecha) }}</p>
            </div>
            <span class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" :class="badgeClass(venta.estado)">
              {{ venta.estado }}
            </span>
          </div>

          <dl class="mt-3 grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-[#F7EEDF] px-3 py-2">
              <dt class="text-xs font-medium text-[#5C4033]">Total</dt>
              <dd class="mt-0.5 text-lg font-bold leading-tight text-[#3A1C12]">{{ formatBs(venta.totalCentavos) }}</dd>
            </div>
            <div class="rounded-xl px-3 py-2" :class="venta.gananciaTotalCentavos < 0 ? 'bg-amber-50' : 'bg-green-50'">
              <dt class="text-xs font-medium text-[#5C4033]">Ganancia</dt>
              <dd class="mt-0.5 font-bold" :class="venta.gananciaTotalCentavos < 0 ? 'text-amber-800' : 'text-green-800'">{{ formatBs(venta.gananciaTotalCentavos) }}</dd>
            </div>
          </dl>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              v-if="venta.estado !== 'Completo'"
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Completar pago de venta ${venta.id}`"
              @click="openPayment(venta)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h.01M18 12h.01M9 12h6" /><path d="m15 4 2 2 4-4" />
              </svg>
              Completar pago
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D4A574] px-3 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Ver detalle de venta ${venta.id}`"
              @click="openDetail(venta)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
              </svg>
              Detalle
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D4A574] px-3 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Imprimir factura de venta ${venta.id}`"
              @click="printSale(venta)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" />
              </svg>
              Imprimir
            </button>
            <VentasEliminarVentaBoton
              :venta="venta"
              :disabled="actionsDisabled"
              @deleted="(id: number) => { successMessage = `Venta N.º ${id} eliminada correctamente.`; fetchVentas() }"
            />
          </div>
        </li>
      </ul>

      <!-- Paginación -->
      <nav
        aria-label="Paginación del historial"
        class="mt-4 flex flex-col items-center justify-between gap-3 rounded-3xl border border-[#E3CFB4] bg-white p-4 text-sm sm:flex-row"
      >
        <p class="text-[#5C4033]">Mostrando {{ firstVisible }}–{{ lastVisible }} de {{ totalCount }} ventas</p>
        <div class="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <button
            type="button"
            :disabled="!hasPreviousPage || actionsDisabled"
            class="min-h-11 rounded-xl border border-[#D4A574] px-4 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50"
            @click="goToPage(page - 1)"
          >Anterior</button>
          <span class="px-1 text-center font-semibold text-[#3A1C12]">Página {{ page }} de {{ totalPages }}</span>
          <button
            type="button"
            :disabled="!hasNextPage || actionsDisabled"
            class="min-h-11 rounded-xl border border-[#D4A574] px-4 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50"
            @click="goToPage(page + 1)"
          >Siguiente</button>
        </div>
      </nav>
    </template>

    <!-- ── Modales ────────────────────────────────────────────────────────────── -->
    <HistorialDetalleModal
      :open="showDetailModal"
      :detalle="detalle"
      :loading="detalleLoading"
      :error="detalleError"
      :warning="detalleAdvertencia"
      :editing="editing"
      :edit-error="editError"
      @close="closeDetail"
      @retry="retryDetail"
      @guardar-edicion="onGuardarEdicion"
    />
    <HistorialPagoModal
      :open="showPaymentModal"
      :venta="selectedPaymentVenta"
      :paying="paying"
      :error="pagoError"
      @close="closePayment"
      @confirm="confirmPayment"
    />
    <HistorialResumenDiaModal
      :open="showResumenDiaModal"
      :loading="resumenDiaLoading"
      :error="resumenDiaError"
      :resumen="resumenDia"
      @close="showResumenDiaModal = false"
      @consultar="loadResumenDia"
    />
  </section>

  <HistorialVentaComprobante :detalle="printReceipt" :active="printMode === 'receipt'" />
  <HistorialVentasReporte :reporte="reporte" :active="printMode === 'report'" />
  <HistorialResumenPorDiaReporte :resumen="resumenPorDia" :active="printMode === 'resumen-por-dia'" />
</template>
