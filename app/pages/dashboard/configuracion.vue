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
    <VolverDashboard />
    <header class="mb-6">
      <p class="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Sistema</p>
      <h1 id="configuracion-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Configuración</h1>
      <p class="mt-2 text-sm text-gray-600">Administra el almacenamiento, libera espacio y exporta tus datos.</p>
    </header>

    <!-- ── 1. Almacenamiento ────────────────────────────────────────────────── -->
    <section aria-labelledby="almacenamiento-title" class="mb-6 rounded-xl border border-[#D4A574] bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="almacenamiento-title" class="text-lg font-bold text-[#6B3A2A]">Almacenamiento</h2>
          <p class="mt-1 text-sm text-gray-600">Espacio que ocupa tu información en la base de datos.</p>
        </div>
        <button
          type="button"
          :disabled="usoLoading"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D4A574] px-4 py-2 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-60"
          @click="cargarUso"
        >
          <svg class="h-4 w-4" :class="{ 'animate-spin': usoLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>
          </svg>
          {{ usoLoading ? 'Midiendo...' : 'Actualizar' }}
        </button>
      </div>

      <!-- Notificación al llegar al umbral de 450 MB -->
      <div
        v-if="enAlerta"
        role="alert"
        class="mt-4 flex gap-3 rounded-xl border p-4 text-sm"
        :class="nivel === 'critico' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>
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

      <div v-if="usoError" role="alert" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{{ usoError }}</p>
        <button
          type="button"
          class="mt-3 min-h-11 rounded-lg bg-[#6B3A2A] px-4 py-2 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          @click="cargarUso"
        >Reintentar</button>
      </div>

      <div v-else-if="!uso" role="status" class="mt-4 flex items-center gap-3 text-sm text-gray-600">
        <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
        Midiendo el espacio utilizado...
      </div>

      <div v-else class="mt-5">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-2xl font-bold text-gray-900">
            {{ usadoMb }} MB
            <span class="text-base font-medium text-gray-600">de {{ limiteMb }} MB</span>
          </p>
          <p class="text-sm font-semibold text-gray-700">{{ porcentaje }}% usado</p>
        </div>

        <div
          class="mt-3 h-4 w-full overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-label="Espacio de almacenamiento usado"
          aria-valuemin="0"
          :aria-valuemax="limiteMb"
          :aria-valuenow="usadoMb"
          :aria-valuetext="`${usadoMb} MB de ${limiteMb} MB usados`"
        >
          <div class="h-full rounded-full transition-all duration-500" :class="barraClase" :style="{ width: `${porcentaje}%` }" />
        </div>
        <p class="mt-2 text-xs text-gray-500">
          Disponible: {{ Math.max(Math.round((limiteMb - usadoMb) * 10) / 10, 0) }} MB · Última medición: {{ medidoEnTexto }}
        </p>

        <div v-if="tablasPrincipales.length" class="mt-5">
          <h3 class="text-sm font-bold text-[#6B3A2A]">Tablas que más ocupan</h3>
          <ul class="mt-2 divide-y divide-[#D4A574]/40 rounded-lg border border-[#D4A574]/60 text-sm">
            <li v-for="tabla in tablasPrincipales" :key="tabla.tabla" class="flex items-center justify-between gap-4 px-3 py-2">
              <span class="font-medium text-gray-800">{{ tabla.tabla }}</span>
              <span class="text-gray-600">{{ formatMb(tabla.bytes) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 2. Liberar espacio ───────────────────────────────────────────────── -->
    <section aria-labelledby="liberar-title" class="mb-6 rounded-xl border border-[#D4A574] bg-white p-5 shadow-sm">
      <h2 id="liberar-title" class="text-lg font-bold text-[#6B3A2A]">Liberar espacio</h2>
      <p class="mt-1 text-sm text-gray-600">
        Elimina todas las ventas de un rango de fechas. Se borran también sus productos vendidos.
        <strong class="text-red-700">Esta acción es permanente y no se puede deshacer.</strong>
      </p>

      <p v-if="limpiezaMensaje" role="status" aria-live="polite" class="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
        {{ limpiezaMensaje }}
      </p>

      <form class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_12rem_auto]" @submit.prevent="aceptarRango">
        <div>
          <label for="limpieza-desde" class="mb-1 block text-xs font-semibold text-gray-600">Desde</label>
          <input
            id="limpieza-desde"
            v-model="fechaDesde"
            type="date"
            :disabled="limpiezaOcupada"
            :max="fechaHasta || undefined"
            class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div>
          <label for="limpieza-hasta" class="mb-1 block text-xs font-semibold text-gray-600">Hasta</label>
          <input
            id="limpieza-hasta"
            v-model="fechaHasta"
            type="date"
            :disabled="limpiezaOcupada"
            :min="fechaDesde || undefined"
            class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            :class="{ 'border-red-400 focus:ring-red-300': errorFecha }"
          >
        </div>
        <div class="flex items-end">
          <button
            type="submit"
            :disabled="limpiezaOcupada"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-5 py-2.5 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
          >
            <span v-if="contando" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            {{ contando ? 'Buscando...' : 'Aceptar' }}
          </button>
        </div>
      </form>

      <p v-if="errorFecha" role="alert" class="mt-3 text-sm font-medium text-red-600">{{ errorFecha }}</p>
      <p v-if="limpiezaError && !showRangoModal" role="alert" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ limpiezaError }}
      </p>
    </section>

    <!-- ── 3. Exportaciones ─────────────────────────────────────────────────── -->
    <section aria-labelledby="exportar-title" class="rounded-xl border border-[#D4A574] bg-white p-5 shadow-sm">
      <h2 id="exportar-title" class="text-lg font-bold text-[#6B3A2A]">Exportar a Excel</h2>
      <p class="mt-1 text-sm text-gray-600">
        Descarga un respaldo de tus datos en un archivo que Excel abre directamente.
      </p>

      <p v-if="exportMensaje" role="status" aria-live="polite" class="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
        {{ exportMensaje }}
      </p>
      <p v-if="exportError" role="alert" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ exportError }}
      </p>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          :disabled="exportOcupado"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
          @click="exportarClientes"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2"/>
          </svg>
          {{ exportandoClientes ? 'Exportando...' : 'Exportar clientes a Excel' }}
        </button>
        <button
          type="button"
          :disabled="exportOcupado"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
          @click="exportarProductos"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2"/>
          </svg>
          {{ exportandoProductos ? 'Exportando...' : 'Exportar productos a Excel' }}
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
