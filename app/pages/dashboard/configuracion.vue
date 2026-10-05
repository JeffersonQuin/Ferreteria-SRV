<script setup lang="ts">
import EliminarVentasRangoModal from '~/components/configuracion/EliminarVentasRangoModal.vue'
import { downloadCsv, formatCsvDate, todayStamp, toCsv } from '~/utils/csv'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Configuración - Ferretería SRV' })

const {
  uso,
  loading: usoLoading,
  error: usoError,
  usadoMb,
  limiteMb,
  umbralMb,
  porcentaje,
  enAlerta,
  nivel,
  tablasPrincipales,
  cargarUso
} = useAlmacenamiento()

const {
  fechaDesde,
  fechaHasta,
  errorFecha,
  contando,
  eliminando,
  error: limpiezaError,
  coincidencias,
  contarVentas,
  eliminarVentas,
  limpiarEstado,
  limpiarRango
} = useLimpiezaVentas()

const { clientes, fetchClientes } = useClientes()
const { productos, fetchProductos } = useProductos()

const showRangoModal = ref(false)
const limpiezaMensaje = ref<string | null>(null)
const exportandoClientes = ref(false)
const exportandoProductos = ref(false)
const exportMensaje = ref<string | null>(null)
const exportError = ref<string | null>(null)

const limpiezaOcupada = computed(() => contando.value || eliminando.value)
const exportOcupado = computed(() => exportandoClientes.value || exportandoProductos.value)

const barraClase = computed(() => {
  if (nivel.value === 'critico') return 'bg-red-600'
  if (nivel.value === 'alerta') return 'bg-amber-500'
  return 'bg-green-600'
})

const medidoEnTexto = computed(() => {
  if (!uso.value) return null
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' })
    .format(new Date(uso.value.medidoEn))
})

function formatMb(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${(Math.round(mb * 100) / 100).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`
}

// ── Eliminar ventas por rango ────────────────────────────────────────────────
async function aceptarRango() {
  limpiezaMensaje.value = null
  const total = await contarVentas()
  if (total === null) return // errorFecha o error ya fueron seteados
  showRangoModal.value = true
}

function cerrarRangoModal() {
  if (eliminando.value) return
  showRangoModal.value = false
  limpiarEstado()
}

async function confirmarEliminacion() {
  const desde = fechaDesde.value
  const hasta = fechaHasta.value
  const eliminadas = await eliminarVentas()
  if (eliminadas === null) return // el error se muestra dentro del modal para poder reintentar

  showRangoModal.value = false
  limpiezaMensaje.value = eliminadas === 0
    ? 'No había ventas en el rango seleccionado.'
    : `Se eliminaron ${eliminadas} ${eliminadas === 1 ? 'venta' : 'ventas'} entre ${desde} y ${hasta}.`
  limpiarRango()
  // El espacio liberado se refleja al volver a medir
  await cargarUso()
}

// ── Exportaciones a Excel ────────────────────────────────────────────────────
async function exportarClientes() {
  if (exportOcupado.value) return
  exportandoClientes.value = true
  exportMensaje.value = null
  exportError.value = null

  try {
    const ok = await fetchClientes()
    if (!ok) throw new Error('No fue posible cargar los clientes para exportar.')

    const filas = clientes.value.map(cliente => [
      cliente.id,
      cliente.nombre,
      cliente.celular,
      formatCsvDate(cliente.created_at)
    ])
    downloadCsv(`clientes-${todayStamp()}.csv`, toCsv(['ID', 'Nombre', 'Celular', 'Registrado'], filas))
    exportMensaje.value = `Se exportaron ${filas.length} ${filas.length === 1 ? 'cliente' : 'clientes'}.`
  } catch (cause) {
    console.error('[Configuracion] No fue posible exportar clientes', cause)
    exportError.value = cause instanceof Error ? cause.message : 'No fue posible exportar los clientes.'
  } finally {
    exportandoClientes.value = false
  }
}

async function exportarProductos() {
  if (exportOcupado.value) return
  exportandoProductos.value = true
  exportMensaje.value = null
  exportError.value = null

  try {
    const ok = await fetchProductos()
    if (!ok) throw new Error('No fue posible cargar los productos para exportar.')

    const filas = productos.value.map(producto => [
      producto.id,
      producto.nombre,
      producto.descripcion,
      Number(producto.precio_costo),
      Number(producto.precio_venta),
      formatCsvDate(producto.created_at)
    ])
    downloadCsv(
      `productos-${todayStamp()}.csv`,
      toCsv(['ID', 'Nombre', 'Descripción', 'Precio costo (Bs)', 'Precio venta (Bs)', 'Registrado'], filas)
    )
    exportMensaje.value = `Se exportaron ${filas.length} ${filas.length === 1 ? 'producto' : 'productos'}.`
  } catch (cause) {
    console.error('[Configuracion] No fue posible exportar productos', cause)
    exportError.value = cause instanceof Error ? cause.message : 'No fue posible exportar los productos.'
  } finally {
    exportandoProductos.value = false
  }
}

onMounted(cargarUso)
</script>

<template>
  <section aria-labelledby="configuracion-title" class="min-w-0">
    <VolverDashboard
      titulo="Configuración"
      titulo-id="configuracion-title"
      descripcion="Administra el almacenamiento, libera espacio y exporta tus datos."
      tono="pizarra"
    >
      <template #icon>
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </template>
    </VolverDashboard>

    <!-- ── 1. Almacenamiento ────────────────────────────────────────────────── -->
    <section aria-labelledby="almacenamiento-title" class="mb-5 rounded-3xl border border-[#E3CFB4] bg-white p-5 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6EAEE] text-[#3E4852]" aria-hidden="true">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></svg>
        </span>
        <div class="min-w-0">
          <h2 id="almacenamiento-title" class="text-lg font-bold text-[#3A1C12]">Almacenamiento</h2>
          <p class="mt-0.5 text-sm text-[#5C4033]">Espacio que ocupa tu información en la base de datos.</p>
        </div>
      </div>

      <!-- Notificación al llegar al umbral de 450 MB -->
      <div
        v-if="enAlerta"
        role="alert"
        class="mt-4 flex gap-3 rounded-2xl border p-4 text-sm"
        :class="nivel === 'critico' ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-950'"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" />
        </svg>
        <p>
          <template v-if="nivel === 'critico'">
            <strong>Alcanzaste el límite de almacenamiento.</strong>
            Estás usando {{ usadoMb }} MB de {{ limiteMb }} MB. Libera espacio ahora eliminando ventas antiguas por rango de fechas.
          </template>
          <template v-else>
            <strong>Te estás quedando sin espacio.</strong>
            Estás usando {{ usadoMb }} MB de {{ limiteMb }} MB (más de {{ umbralMb }} MB). Libera espacio eliminando ventas antiguas por rango de fechas.
          </template>
        </p>
      </div>

      <div v-if="usoError" role="alert" class="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{{ usoError }}</p>
        <button
          type="button"
          class="mt-3 min-h-11 rounded-xl bg-[#6B3A2A] px-4 py-2 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
          @click="cargarUso"
        >Reintentar</button>
      </div>

      <div v-else-if="!uso" role="status" class="mt-4 flex items-center gap-3 text-sm text-gray-700">
        <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
        Midiendo el espacio utilizado...
      </div>

      <div v-else class="mt-5">
        <div class="rounded-2xl bg-[#F1F3F5] px-4 py-3">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p class="text-3xl font-bold leading-tight text-[#2B343C]">
              {{ usadoMb }} MB
              <span class="text-base font-medium text-[#4A5560]">de {{ limiteMb }} MB</span>
            </p>
            <p class="text-sm font-bold text-[#2B343C]">{{ porcentaje }}% usado</p>
          </div>

          <div
            class="mt-3 h-5 w-full overflow-hidden rounded-full bg-[#D5DADF]"
            role="progressbar"
            aria-label="Espacio de almacenamiento usado"
            aria-valuemin="0"
            :aria-valuemax="limiteMb"
            :aria-valuenow="usadoMb"
            :aria-valuetext="`${usadoMb} MB de ${limiteMb} MB usados`"
          >
            <div class="h-full rounded-full transition-all duration-500 motion-reduce:transition-none" :class="barraClase" :style="{ width: `${porcentaje}%` }" />
          </div>
          <p class="mt-2 text-sm text-[#4A5560]">
            Disponible: {{ Math.max(Math.round((limiteMb - usadoMb) * 10) / 10, 0) }} MB · Última medición: {{ medidoEnTexto }}
          </p>
        </div>

        <div v-if="tablasPrincipales.length" class="mt-5">
          <h3 class="text-sm font-bold text-[#3A1C12]">Tablas que más ocupan</h3>
          <ul class="mt-2 divide-y divide-[#F0E2CE] overflow-hidden rounded-2xl border border-[#E3CFB4] text-sm">
            <li v-for="tabla in tablasPrincipales" :key="tabla.tabla" class="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5">
              <span class="min-w-0 break-words font-medium text-[#3A1C12]">{{ tabla.tabla }}</span>
              <span class="shrink-0 font-semibold text-[#4A5560]">{{ formatMb(tabla.bytes) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <button
        type="button"
        :disabled="usoLoading"
        class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#56636F] px-4 text-sm font-semibold text-[#2B343C] hover:bg-[#E6EAEE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#56636F] disabled:opacity-60 sm:w-auto"
        @click="cargarUso"
      >
        <svg class="h-4 w-4" :class="{ 'animate-spin': usoLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
        </svg>
        {{ usoLoading ? 'Midiendo...' : 'Actualizar medición' }}
      </button>
    </section>

    <!-- ── 2. Liberar espacio (zona de peligro) ─────────────────────────────── -->
    <section aria-labelledby="liberar-title" class="mb-5 rounded-3xl border border-[#E3CFB4] bg-white p-5 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8E3DD] text-[#9A4330]" aria-hidden="true">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" /></svg>
        </span>
        <div class="min-w-0">
          <h2 id="liberar-title" class="text-lg font-bold text-[#3A1C12]">Liberar espacio</h2>
          <p class="mt-0.5 text-sm text-[#5C4033]">Elimina las ventas de un rango de fechas, junto con sus productos vendidos.</p>
        </div>
      </div>

      <p class="mt-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
        <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
        <span>Esta acción es permanente y no se puede deshacer.</span>
      </p>

      <p v-if="limpiezaMensaje" role="status" aria-live="polite" class="mt-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
        <span>{{ limpiezaMensaje }}</span>
      </p>

      <form class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[12rem_12rem_auto]" @submit.prevent="aceptarRango">
        <div>
          <label for="limpieza-desde" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Desde</label>
          <input
            id="limpieza-desde"
            v-model="fechaDesde"
            type="date"
            :disabled="limpiezaOcupada"
            :max="fechaHasta || undefined"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-3 py-3 text-base text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100 sm:text-sm"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div>
          <label for="limpieza-hasta" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Hasta</label>
          <input
            id="limpieza-hasta"
            v-model="fechaHasta"
            type="date"
            :disabled="limpiezaOcupada"
            :min="fechaDesde || undefined"
            class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-3 py-3 text-base text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100 sm:text-sm"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div class="col-span-2 flex items-end lg:col-span-1">
          <button
            type="submit"
            :disabled="limpiezaOcupada"
            class="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#B5533C] to-[#8A3524] px-5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(138,53,36,0.7)] transition-all duration-200 enabled:hover:from-[#C2603F] enabled:hover:to-[#9A4330] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A3524] focus-visible:ring-offset-2 enabled:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none lg:w-auto"
          >
            <span v-if="contando" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            {{ contando ? 'Buscando...' : 'Aceptar' }}
          </button>
        </div>
      </form>

      <p v-if="errorFecha" role="alert" class="mt-3 text-sm font-medium text-red-700">{{ errorFecha }}</p>
      <p v-if="limpiezaError && !showRangoModal" role="alert" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ limpiezaError }}
      </p>
    </section>

    <!-- ── 3. Exportaciones ─────────────────────────────────────────────────── -->
    <section aria-labelledby="exportar-title" class="rounded-3xl border border-[#E3CFB4] bg-white p-5 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E4EBD0] text-[#505E26]" aria-hidden="true">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2" /></svg>
        </span>
        <div class="min-w-0">
          <h2 id="exportar-title" class="text-lg font-bold text-[#3A1C12]">Exportar a Excel</h2>
          <p class="mt-0.5 text-sm text-[#5C4033]">Descarga un respaldo de tus datos en un archivo que Excel abre directamente.</p>
        </div>
      </div>

      <p v-if="exportMensaje" role="status" aria-live="polite" class="mt-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
        <span>{{ exportMensaje }}</span>
      </p>
      <p v-if="exportError" role="alert" class="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ exportError }}
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          :disabled="exportOcupado"
          class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#C2603F] to-[#9A4330] px-5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(154,67,48,0.7)] transition-all duration-200 enabled:hover:from-[#CF6B49] enabled:hover:to-[#A84A36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9A4330] focus-visible:ring-offset-2 enabled:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          @click="exportarClientes"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6m3-3h-6" />
          </svg>
          {{ exportandoClientes ? 'Exportando...' : 'Exportar clientes' }}
        </button>
        <button
          type="button"
          :disabled="exportOcupado"
          class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#B07A1E] to-[#8A5E12] px-5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(138,94,18,0.7)] transition-all duration-200 enabled:hover:from-[#BC8524] enabled:hover:to-[#966816] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5E12] focus-visible:ring-offset-2 enabled:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          @click="exportarProductos"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
          </svg>
          {{ exportandoProductos ? 'Exportando...' : 'Exportar productos' }}
        </button>
      </div>
    </section>

    <EliminarVentasRangoModal
      :open="showRangoModal"
      :desde="fechaDesde"
      :hasta="fechaHasta"
      :coincidencias="coincidencias"
      :eliminando="eliminando"
      :error="limpiezaError"
      @close="cerrarRangoModal"
      @confirm="confirmarEliminacion"
    />
  </section>
</template>
