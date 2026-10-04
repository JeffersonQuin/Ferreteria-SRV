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
    <VolverDashboard />
    <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Operaciones</p>
        <h1 id="historial-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Historial de ventas</h1>
        <p class="mt-2 text-sm text-gray-600">Consulta, imprime y exporta tus ventas</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="actionsDisabled"
          @click="showResumenDiaModal = true"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
          </svg>
          Resumen del día
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="actionsDisabled || loadingResumenPorDia"
          @click="exportResumenPorDia"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
            <path d="M8 14h.01M12 14h.01M16 14h.01"/>
          </svg>
          {{ loadingResumenPorDia ? 'Preparando...' : printing && printMode === 'resumen-por-dia' ? 'Abriendo...' : 'Informe de ventas' }}
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="actionsDisabled || totalCount === 0"
          @click="exportPdf"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4"/>
            <path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2"/>
          </svg>
          {{ exporting ? 'Preparando...' : printing && printMode === 'report' ? 'Abriendo...' : 'Exportar PDF' }}
        </button>
      </div>
    </header>

    <p v-if="successMessage" role="status" aria-live="polite" class="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
      {{ successMessage }}
    </p>
    <p v-if="printError || exportError" role="alert" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ printError || exportError }}
    </p>

    <!-- ── Filtros ──────────────────────────────────────────────────────────── -->
    <section aria-label="Filtros del historial" class="mb-5 rounded-xl border border-[#D4A574] bg-white p-4 shadow-sm">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_12rem_auto]">
        <!-- Buscar por cliente -->
        <div class="lg:col-span-1">
          <label for="buscar-cliente" class="mb-1 block text-xs font-semibold text-gray-600">Buscar por cliente</label>
          <div class="relative">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              id="buscar-cliente"
              v-model="busquedaCliente"
              type="search"
              placeholder="Nombre de cliente..."
              :disabled="actionsDisabled"
              class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            >
          </div>
        </div>

        <!-- Estado -->
        <div class="lg:col-span-1">
          <label for="filtro-estado" class="mb-1 block text-xs font-semibold text-gray-600">Estado</label>
          <select
            id="filtro-estado"
            v-model="estadoFiltro"
            :disabled="actionsDisabled"
            class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Completo">Completo</option>
            <option value="Pendiente">Pendiente</option>
            <option value="No pagado">No pagado</option>
          </select>
        </div>

        <!-- Fecha Desde -->
        <div>
          <label for="fecha-desde" class="mb-1 block text-xs font-semibold text-gray-600">Desde</label>
          <input
            id="fecha-desde"
            v-model="fechaDesde"
            type="date"
            :disabled="actionsDisabled"
            :max="fechaHasta || undefined"
            class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>

        <!-- Fecha Hasta -->
        <div>
          <label for="fecha-hasta" class="mb-1 block text-xs font-semibold text-gray-600">Hasta</label>
          <input
            id="fecha-hasta"
            v-model="fechaHasta"
            type="date"
            :disabled="actionsDisabled"
            :min="fechaDesde || undefined"
            class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>

        <!-- Botón limpiar fechas -->
        <div class="flex items-end">
          <button
            type="button"
            :disabled="actionsDisabled || (!fechaDesde && !fechaHasta)"
            class="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[#D4A574] px-3 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50 lg:w-auto"
            title="Limpiar filtros de fecha"
            @click="limpiarFiltrosFecha"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Limpiar fechas
          </button>
        </div>
      </div>

      <!-- Error de validación de fechas -->
      <p
        v-if="errorFecha"
        role="alert"
        class="mt-3 text-sm font-medium text-red-600"
      >
        {{ errorFecha }}
      </p>
    </section>

    <!-- ── Cargando ──────────────────────────────────────────────────────────── -->
    <div
      v-if="loading"
      role="status"
      class="flex items-center gap-3 rounded-xl border border-[#D4A574] bg-white p-5 text-sm text-gray-600"
    >
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
      Cargando historial de ventas...
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────────────── -->
    <div v-else-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button
        type="button"
        class="mt-3 min-h-11 rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
        @click="fetchVentas"
      >Reintentar</button>
    </div>

    <!-- ── Sin resultados ────────────────────────────────────────────────────── -->
    <div
      v-else-if="ventas.length === 0"
      class="rounded-xl border border-[#D4A574] bg-white px-5 py-12 text-center shadow-sm"
    >
      <svg class="mx-auto h-12 w-12 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M3 3v18h18"/><path d="m7 16 4-4 3 3 5-7"/>
      </svg>
      <h2 class="mt-3 font-bold text-[#6B3A2A]">No se encontraron ventas</h2>
      <p class="mt-1 text-sm text-gray-600">Prueba con otro nombre de cliente, estado o rango de fechas.</p>
    </div>

    <!-- ── Tabla de ventas ──────────────────────────────────────────────────── -->
    <template v-else>
      <div class="overflow-x-auto rounded-xl border border-[#D4A574] bg-white shadow-sm">
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
                  <!-- Ver detalle -->
                  <button
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
                    :aria-label="`Ver detalle de venta ${venta.id}`"
                    title="Ver Detalle"
                    @click="openDetail(venta)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <!-- Imprimir -->
                  <button
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
                    :aria-label="`Imprimir factura de venta ${venta.id}`"
                    title="Imprimir Factura"
                    @click="printSale(venta)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <path d="M6 14h12v8H6z"/>
                    </svg>
                  </button>
                  <!-- Completar pago (solo si no está completo) -->
                  <button
                    v-if="venta.estado !== 'Completo'"
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
                    :aria-label="`Completar pago de venta ${venta.id}`"
                    title="Completar Pago"
                    @click="openPayment(venta)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 12h.01M18 12h.01M9 12h6"/>
                      <path d="m15 4 2 2 4-4"/>
                    </svg>
                  </button>
                  <!-- Eliminar venta (incluye modal de confirmación) -->
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

      <!-- Paginación -->
      <nav
        aria-label="Paginación del historial"
        class="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-[#D4A574] bg-white p-4 text-sm sm:flex-row"
      >
        <p class="text-gray-600">Mostrando {{ firstVisible }}–{{ lastVisible }} de {{ totalCount }} ventas</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="!hasPreviousPage || actionsDisabled"
            class="min-h-10 rounded-lg border border-[#D4A574] px-3 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
            @click="goToPage(page - 1)"
          >Anterior</button>
          <span class="px-2 font-semibold text-gray-700">Página {{ page }} de {{ totalPages }}</span>
          <button
            type="button"
            :disabled="!hasNextPage || actionsDisabled"
            class="min-h-10 rounded-lg border border-[#D4A574] px-3 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
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
