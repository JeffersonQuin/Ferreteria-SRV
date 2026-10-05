<script setup lang="ts">
import ConvertirCotizacionModal from '~/components/cotizaciones/ConvertirCotizacionModal.vue'
import EliminarCotizacionModal from '~/components/cotizaciones/EliminarCotizacionModal.vue'
import HistorialCotizacionComprobante from '~/components/cotizaciones/HistorialCotizacionComprobante.vue'
import HistorialCotizacionDetalleModal from '~/components/cotizaciones/HistorialCotizacionDetalleModal.vue'
import HistorialVentaComprobante from '~/components/ventas/HistorialVentaComprobante.vue'
import type {
  ConversionResultado,
  HistorialCotizacion,
  HistorialCotizacionDetalle
} from '~/composables/useHistorialCotizaciones'
import type { HistorialVentaDetalle } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Historial de Cotizaciones - Ferretería SRV' })

const {
  cotizaciones,
  totalCount,
  page,
  pageSize,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  busquedaCliente,
  fechaDesde,
  fechaHasta,
  errorFecha,
  loading,
  error,
  detalle,
  detalleLoading,
  detalleError,
  detalleAdvertencia,
  converting,
  convertError,
  deleting,
  deleteError,
  fetchCotizaciones,
  goToPage,
  loadDetail,
  clearDetail,
  limpiarFiltrosFecha,
  convertirAVenta,
  clearConvertError,
  eliminarCotizacion,
  clearDeleteError
} = useHistorialCotizaciones()

const showDetailModal = ref(false)
const showConvertModal = ref(false)
const showDeleteModal = ref(false)
const selectedConvertCotizacion = shallowRef<HistorialCotizacion | null>(null)
const selectedDeleteCotizacion = shallowRef<HistorialCotizacion | null>(null)
const printQuote = shallowRef<HistorialCotizacionDetalle | null>(null)
const printSaleReceipt = shallowRef<HistorialVentaDetalle | null>(null)
const printMode = ref<'quote' | 'sale-receipt' | null>(null)
const printing = ref(false)
const printError = ref<string | null>(null)
const conversion = shallowRef<ConversionResultado | null>(null)
const deleteMessage = ref<string | null>(null)

const firstVisible = computed(() => totalCount.value === 0 ? 0 : (page.value - 1) * pageSize + 1)
const lastVisible = computed(() => Math.min(page.value * pageSize, totalCount.value))
const actionsDisabled = computed(() => loading.value || converting.value || deleting.value || printing.value)

const successMessage = computed(() => {
  if (!conversion.value) return null
  const { cotizacionId, detalle: ventaDetalle, cambioCentavos } = conversion.value
  const base = `Cotización N.º ${cotizacionId} convertida en venta N.º ${ventaDetalle.venta.id} (${ventaDetalle.venta.estado}).`
  return cambioCentavos > 0 ? `${base} Devolver cambio: ${formatBs(cambioCentavos)}.` : base
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

// ── Detalle ──────────────────────────────────────────────────────────────────
const selectedDetailCotizacion = shallowRef<HistorialCotizacion | null>(null)

async function openDetail(cotizacion: HistorialCotizacion) {
  selectedDetailCotizacion.value = cotizacion
  showDetailModal.value = true
  await loadDetail(cotizacion)
}

async function retryDetail() {
  if (selectedDetailCotizacion.value) await loadDetail(selectedDetailCotizacion.value, true)
}

function closeDetail() {
  showDetailModal.value = false
  selectedDetailCotizacion.value = null
  clearDetail()
}

// ── Conversión a venta ───────────────────────────────────────────────────────
function openConvert(cotizacion: HistorialCotizacion) {
  if (cotizacion.ventaId !== null) return
  clearConvertError()
  selectedConvertCotizacion.value = cotizacion
  showConvertModal.value = true
}

function closeConvert() {
  if (converting.value) return
  showConvertModal.value = false
  selectedConvertCotizacion.value = null
  clearConvertError()
}

async function confirmConvert(descuento: string, montoPagado: string) {
  if (!selectedConvertCotizacion.value) return
  const result = await convertirAVenta(selectedConvertCotizacion.value, descuento, montoPagado)
  if (!result) return // convertError ya fue seteado en el composable

  conversion.value = result
  deleteMessage.value = null
  printError.value = null
  showConvertModal.value = false
  selectedConvertCotizacion.value = null
  clearConvertError()
}

function dismissConversion() {
  conversion.value = null
}

// ── Eliminación (con confirmación en modal) ──────────────────────────────────
function openDelete(cotizacion: HistorialCotizacion) {
  if (actionsDisabled.value) return
  clearDeleteError()
  deleteMessage.value = null
  selectedDeleteCotizacion.value = cotizacion
  showDeleteModal.value = true
}

function closeDelete() {
  if (deleting.value) return
  showDeleteModal.value = false
  selectedDeleteCotizacion.value = null
  clearDeleteError()
}

async function confirmDelete() {
  const cotizacion = selectedDeleteCotizacion.value
  if (!cotizacion) return

  const deleted = await eliminarCotizacion(cotizacion)
  if (!deleted) return // deleteError se muestra dentro del modal para poder reintentar

  showDeleteModal.value = false
  selectedDeleteCotizacion.value = null
  deleteMessage.value = `Cotización N.º ${cotizacion.id} eliminada correctamente.`
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
    setTimeout(() => { document.title = prevTitle }, 500)
  }
}

async function printQuotation(cotizacion: HistorialCotizacion) {
  if (actionsDisabled.value) return
  printing.value = true
  printError.value = null
  printQuote.value = null

  try {
    const loaded = await loadDetail(cotizacion)
    if (!loaded) throw new Error(detalleError.value || 'No fue posible preparar el comprobante de la cotización.')

    printQuote.value = {
      cotizacion: { ...loaded.cotizacion },
      items: loaded.items.map(item => ({ ...item })),
      totalItemsCentavos: loaded.totalItemsCentavos,
      tieneInconsistencia: loaded.tieneInconsistencia
    }
    printMode.value = 'quote'
    await invokePrint()
  } catch (cause) {
    console.error('[HistorialCotizaciones] No fue posible imprimir la cotización', cause)
    printError.value = cause instanceof Error ? cause.message : 'No fue posible abrir la impresión.'
  } finally {
    printMode.value = null
    printQuote.value = null
    printing.value = false
  }
}

async function printConvertedSale() {
  if (actionsDisabled.value || !conversion.value) return
  printing.value = true
  printError.value = null

  try {
    const { venta, items, totalItemsCentavos, tieneInconsistencia } = conversion.value.detalle
    printSaleReceipt.value = {
      venta: { ...venta },
      items: items.map(item => ({ ...item })),
      totalItemsCentavos,
      tieneInconsistencia
    }
    printMode.value = 'sale-receipt'
    await invokePrint()
  } catch (cause) {
    console.error('[HistorialCotizaciones] No fue posible imprimir el recibo de la venta', cause)
    printError.value = cause instanceof Error ? cause.message : 'No fue posible abrir la impresión.'
  } finally {
    printMode.value = null
    printSaleReceipt.value = null
    printing.value = false
  }
}

onMounted(fetchCotizaciones)
</script>

<template>
  <section aria-labelledby="historial-cotizaciones-title" class="no-print min-w-0">
    <VolverDashboard
      titulo="Historial de cotizaciones"
      titulo-id="historial-cotizaciones-title"
      descripcion="Consulta, imprime, convierte en venta o elimina tus cotizaciones."
      tono="ciruela"
    >
      <template #icon>
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5" />
          <path d="M14 2v6h6M8 9h2M8 13h3" />
          <circle cx="17" cy="17" r="5" />
          <path d="M17 14.5V17l1.5 1" />
        </svg>
      </template>
    </VolverDashboard>

    <div
      v-if="successMessage"
      role="status"
      aria-live="polite"
      class="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4"
    >
      <p class="flex items-start gap-3 text-sm font-semibold text-green-900">
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
        <span>{{ successMessage }}</span>
      </p>
      <div class="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          :disabled="actionsDisabled"
          class="min-h-11 rounded-xl bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-60"
          @click="printConvertedSale"
        >Imprimir recibo</button>
        <button
          type="button"
          class="min-h-11 rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          @click="dismissConversion"
        >Cerrar</button>
      </div>
    </div>
    <p v-if="deleteMessage" role="status" aria-live="polite" class="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">
      <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
      <span>{{ deleteMessage }}</span>
    </p>
    <p v-if="printError" role="alert" class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ printError }}
    </p>

    <!-- ── Filtros ──────────────────────────────────────────────────────────── -->
    <section aria-label="Filtros del historial" class="mb-5 rounded-3xl border border-[#E3CFB4] bg-white p-4 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
      <div>
        <label for="buscar-cliente-cotizacion" class="sr-only">Buscar por cliente</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg class="h-5 w-5 text-[#A9784A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="buscar-cliente-cotizacion"
            v-model="busquedaCliente"
            type="search"
            enterkeyhint="search"
            placeholder="Buscar por nombre de cliente"
            :disabled="actionsDisabled"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white py-3 pl-11 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#653050] focus:outline-none focus:ring-2 focus:ring-[#86446A]/40 disabled:bg-gray-100 sm:text-sm"
          >
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label for="cotizacion-fecha-desde" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Desde</label>
          <input
            id="cotizacion-fecha-desde"
            v-model="fechaDesde"
            type="date"
            :disabled="actionsDisabled"
            :max="fechaHasta || undefined"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-3 py-3 text-base text-gray-900 focus:border-[#653050] focus:outline-none focus:ring-2 focus:ring-[#86446A]/40 disabled:bg-gray-100 sm:text-sm"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div>
          <label for="cotizacion-fecha-hasta" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Hasta</label>
          <input
            id="cotizacion-fecha-hasta"
            v-model="fechaHasta"
            type="date"
            :disabled="actionsDisabled"
            :min="fechaDesde || undefined"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-3 py-3 text-base text-gray-900 focus:border-[#653050] focus:outline-none focus:ring-2 focus:ring-[#86446A]/40 disabled:bg-gray-100 sm:text-sm"
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
      Cargando historial de cotizaciones...
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────────────── -->
    <div v-else-if="error" role="alert" class="rounded-3xl border border-red-200 bg-red-50 p-5">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button
        type="button"
        class="mt-3 min-h-11 rounded-xl bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
        @click="fetchCotizaciones"
      >Reintentar</button>
    </div>

    <!-- ── Sin resultados ────────────────────────────────────────────────────── -->
    <div
      v-else-if="cotizaciones.length === 0"
      class="rounded-3xl border border-[#E3CFB4] bg-white px-5 py-12 text-center shadow-sm"
    >
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3E6ED] text-[#653050]">
        <svg class="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path d="M3 3v18h18" /><path d="m7 16 4-4 3 3 5-7" />
        </svg>
      </span>
      <h2 class="mt-3 font-bold text-[#3A1C12]">No se encontraron cotizaciones</h2>
      <p class="mt-1 text-sm text-[#5C4033]">Prueba con otro nombre de cliente o rango de fechas.</p>
    </div>

    <template v-else>
      <!-- ── Tabla (pantallas grandes) ───────────────────────────────────────── -->
      <div class="hidden overflow-x-auto rounded-3xl border border-[#E3CFB4] bg-white shadow-sm lg:block">
        <table class="min-w-[760px] w-full border-collapse text-sm">
          <thead class="bg-[#F5E6D3] text-left text-xs uppercase tracking-wide text-[#6B3A2A]">
            <tr>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Cliente</th>
              <th class="px-4 py-3 text-right">Total</th>
              <th class="px-4 py-3 text-right">Ganancia</th>
              <th class="px-4 py-3 text-center">Opciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D4A574]/50">
            <tr v-for="cotizacion in cotizaciones" :key="cotizacion.id" class="hover:bg-[#F5E6D3]/35">
              <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ formatDate(cotizacion.fecha) }}</td>
              <td class="px-4 py-3 font-medium text-gray-900">{{ cotizacion.clienteNombre }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{{ formatBs(cotizacion.totalCentavos) }}</td>
              <td
                class="whitespace-nowrap px-4 py-3 text-right font-semibold"
                :class="cotizacion.gananciaTotalCentavos < 0 ? 'text-amber-700' : 'text-green-700'"
              >{{ formatBs(cotizacion.gananciaTotalCentavos) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1">
                  <!-- Ya convertida: ícono de check, sin acción -->
                  <span
                    v-if="cotizacion.ventaId !== null"
                    class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-green-700"
                    role="img"
                    :aria-label="`Cotización ${cotizacion.id} ya convertida en la venta ${cotizacion.ventaId}`"
                    :title="`Convertida · Venta N.º ${cotizacion.ventaId}`"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" />
                    </svg>
                  </span>
                  <button
                    v-else
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-green-700 hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:opacity-50"
                    :aria-label="`Convertir cotización ${cotizacion.id} a venta`"
                    title="Convertir a venta"
                    @click="openConvert(cotizacion)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50"
                    :aria-label="`Ver detalle de cotización ${cotizacion.id}`"
                    title="Ver Detalle"
                    @click="openDetail(cotizacion)"
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
                    :aria-label="`Imprimir cotización ${cotizacion.id}`"
                    title="Imprimir Cotización"
                    @click="printQuotation(cotizacion)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <path d="M6 14h12v8H6z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="actionsDisabled"
                    class="min-h-10 min-w-10 rounded-lg p-2 text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
                    :aria-label="`Eliminar cotización ${cotizacion.id}`"
                    title="Eliminar Cotización"
                    @click="openDelete(cotizacion)"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Tarjetas (celular y tablet) ─────────────────────────────────────── -->
      <ul class="space-y-3 lg:hidden">
        <li
          v-for="cotizacion in cotizaciones"
          :key="cotizacion.id"
          class="rounded-3xl border border-[#E3CFB4] bg-white p-4 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_10px_20px_-14px_rgba(74,36,24,0.35)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="break-words font-semibold leading-tight text-[#3A1C12]">{{ cotizacion.clienteNombre }}</h2>
              <p class="mt-0.5 text-sm text-[#5C4033]">{{ formatDate(cotizacion.fecha) }}</p>
            </div>
            <span
              v-if="cotizacion.ventaId !== null"
              class="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800"
              :title="`Convertida · Venta N.º ${cotizacion.ventaId}`"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              Venta N.º {{ cotizacion.ventaId }}
            </span>
          </div>

          <dl class="mt-3 grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-[#F3E6ED] px-3 py-2">
              <dt class="text-xs font-medium text-[#5C4033]">Total</dt>
              <dd class="mt-0.5 text-lg font-bold leading-tight text-[#3A1C12]">{{ formatBs(cotizacion.totalCentavos) }}</dd>
            </div>
            <div class="rounded-xl px-3 py-2" :class="cotizacion.gananciaTotalCentavos < 0 ? 'bg-amber-50' : 'bg-green-50'">
              <dt class="text-xs font-medium text-[#5C4033]">Ganancia</dt>
              <dd class="mt-0.5 font-bold" :class="cotizacion.gananciaTotalCentavos < 0 ? 'text-amber-800' : 'text-green-800'">{{ formatBs(cotizacion.gananciaTotalCentavos) }}</dd>
            </div>
          </dl>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <button
              v-if="cotizacion.ventaId === null"
              type="button"
              :disabled="actionsDisabled"
              class="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Convertir cotización ${cotizacion.id} a venta`"
              @click="openConvert(cotizacion)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Convertir en venta
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D4A574] px-3 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Ver detalle de cotización ${cotizacion.id}`"
              @click="openDetail(cotizacion)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
              </svg>
              Detalle
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D4A574] px-3 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Imprimir cotización ${cotizacion.id}`"
              @click="printQuotation(cotizacion)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" />
              </svg>
              Imprimir
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              class="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50 active:scale-[0.98]"
              :aria-label="`Eliminar cotización ${cotizacion.id}`"
              @click="openDelete(cotizacion)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" />
              </svg>
              Eliminar
            </button>
          </div>
        </li>
      </ul>

      <nav
        aria-label="Paginación del historial de cotizaciones"
        class="mt-4 flex flex-col items-center justify-between gap-3 rounded-3xl border border-[#E3CFB4] bg-white p-4 text-sm sm:flex-row"
      >
        <p class="text-[#5C4033]">Mostrando {{ firstVisible }}–{{ lastVisible }} de {{ totalCount }} cotizaciones</p>
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
    <HistorialCotizacionDetalleModal
      :open="showDetailModal"
      :detalle="detalle"
      :loading="detalleLoading"
      :error="detalleError"
      :warning="detalleAdvertencia"
      @close="closeDetail"
      @retry="retryDetail"
    />
    <ConvertirCotizacionModal
      :open="showConvertModal"
      :cotizacion="selectedConvertCotizacion"
      :converting="converting"
      :error="convertError"
      @close="closeConvert"
      @confirm="confirmConvert"
    />
    <EliminarCotizacionModal
      :open="showDeleteModal"
      :cotizacion="selectedDeleteCotizacion"
      :deleting="deleting"
      :error="deleteError"
      @close="closeDelete"
      @confirm="confirmDelete"
    />
  </section>

  <HistorialCotizacionComprobante :detalle="printQuote" :active="printMode === 'quote'" />
  <HistorialVentaComprobante :detalle="printSaleReceipt" :active="printMode === 'sale-receipt'" />
</template>
