<script setup lang="ts">
import AutocompleteCliente from '~/components/ventas/AutocompleteCliente.vue'
import ClienteFormModal from '~/components/clientes/ClienteFormModal.vue'
import ModalAgregarProducto from '~/components/ventas/ModalAgregarProducto.vue'
import CotizacionCarrito from '~/components/cotizaciones/CotizacionCarrito.vue'
import CotizacionComprobante from '~/components/cotizaciones/CotizacionComprobante.vue'
import CotizacionExitoModal from '~/components/cotizaciones/CotizacionExitoModal.vue'
import CotizacionResumen from '~/components/cotizaciones/CotizacionResumen.vue'
import type { ClientePayload } from '~/composables/useClientes'
import type { Producto, ProductoPayload } from '~/composables/useProductos'
import { formatBs } from '~/utils/money'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Cotizaciones - Ferretería SRV' })

const {
  clientes,
  loading: loadingClientes,
  saving: savingCliente,
  error: clientesError,
  mutationError: clienteMutationError,
  fetchClientes,
  createCliente,
  clearMutationError: clearClienteError
} = useClientes()
const {
  productos,
  loading: loadingProductos,
  saving: savingProducto,
  error: productosError,
  mutationError: productoMutationError,
  fetchProductos,
  createProducto,
  clearMutationError: clearProductoError
} = useProductos()
const {
  clienteSeleccionado,
  carrito,
  registering,
  error: cotizacionError,
  cotizacionRegistrada,
  comprobante,
  numeroArticulos,
  totalCentavos,
  gananciaCentavos,
  canRegister,
  tieneDatosSinGuardar,
  agregarProductoDirecto,
  actualizarCantidad,
  actualizarPrecioVenta,
  eliminarProducto,
  limpiar,
  registrarCotizacion
} = useCotizaciones()

const showClienteModal = ref(false)
const showSuccessModal = ref(false)
const showModalAgregar = ref(false)
const productoGuardado = ref<Producto | null>(null)
const printError = ref<string | null>(null)
const reopenSuccessButton = ref<HTMLButtonElement | null>(null)
const catalogLoading = computed(() => loadingClientes.value || loadingProductos.value)
const catalogError = computed(() => clientesError.value || productosError.value)

// Barra fija inferior (solo celular): resume el total y lleva al resumen.
const mostrarBarra = computed(() => carrito.value.length > 0 && !cotizacionRegistrada.value)

function irAlResumen() {
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('resumen-cotizacion')?.scrollIntoView({
    behavior: reducirMovimiento ? 'auto' : 'smooth',
    block: 'start'
  })
}

async function loadCatalogs() {
  await Promise.all([fetchClientes(), fetchProductos()])
}

// ── Cliente modal ────────────────────────────────────────────────────────────
function openClienteModal() {
  clearClienteError()
  showClienteModal.value = true
}

function closeClienteModal() {
  if (savingCliente.value) return
  showClienteModal.value = false
  clearClienteError()
}

async function crearClienteRapido(payload: ClientePayload) {
  const created = await createCliente(payload)
  if (!created) return
  clienteSeleccionado.value = created
  closeClienteModal()
}

// ── Creación rápida de producto ──────────────────────────────────────────────
async function crearProductoRapido(payload: ProductoPayload) {
  productoGuardado.value = null
  const created = await createProducto(payload)
  if (!created) return
  productoGuardado.value = created
}

// ── Modal agregar producto ───────────────────────────────────────────────────
function abrirModalAgregar() {
  if (catalogLoading.value || registering.value || cotizacionRegistrada.value) return
  showModalAgregar.value = true
}

function cerrarModalAgregar() {
  showModalAgregar.value = false
}

function onAgregarProducto(
  productoId: number,
  nombre: string,
  precioVentaCentavos: number,
  precioCostoCentavos: number,
  cantidad: number
) {
  agregarProductoDirecto(productoId, nombre, precioVentaCentavos, precioCostoCentavos, cantidad)
  cerrarModalAgregar()
}

// ── Cotización ───────────────────────────────────────────────────────────────
function limpiarConConfirmacion() {
  if (cotizacionRegistrada.value) return
  if (tieneDatosSinGuardar.value && !window.confirm('¿Deseas descartar todos los datos de esta cotización?')) return
  limpiar()
}

async function registrarCotizacionConExito() {
  const registered = await registrarCotizacion()
  if (!registered) return
  printError.value = null
  showSuccessModal.value = true
}

async function closeSuccessModal() {
  showSuccessModal.value = false
  await nextTick()
  reopenSuccessButton.value?.focus()
}

function reopenSuccessModal() {
  showSuccessModal.value = true
}

function nuevaCotizacion() {
  showSuccessModal.value = false
  printError.value = null
  limpiar()
}

async function imprimir() {
  if (!comprobante.value) {
    printError.value = 'No se encontró el comprobante de esta cotización.'
    return
  }

  printError.value = null
  await nextTick()

  try {
    if (typeof window === 'undefined' || typeof window.print !== 'function') {
      throw new Error('La impresión no está disponible en este navegador.')
    }
    window.print()
  } catch (cause) {
    console.error('[Cotizaciones] No fue posible imprimir', cause)
    printError.value = 'No fue posible abrir la impresión. Inténtalo nuevamente o revisa la configuración del navegador.'
  }
}

onMounted(loadCatalogs)
</script>

<template>
  <section
    aria-labelledby="cotizaciones-title"
    class="no-print min-w-0"
    :class="mostrarBarra ? 'pb-28 lg:pb-0' : ''"
  >
    <VolverDashboard
      titulo="Cotizaciones"
      titulo-id="cotizaciones-title"
      descripcion="Selecciona un cliente y agrega productos para generar una cotización."
      tono="petroleo"
    >
      <template #icon>
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
          <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
        </svg>
      </template>
    </VolverDashboard>

    <div v-if="catalogLoading" class="mb-5 flex items-center gap-3 rounded-2xl border border-[#E3CFB4] bg-white p-4 text-sm text-gray-700" role="status">
      <svg class="h-5 w-5 animate-spin text-[#6B3A2A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
      </svg>
      Cargando clientes y productos...
    </div>

    <div v-else-if="catalogError" class="mb-5 flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
      <p class="text-sm text-red-700">{{ catalogError }}</p>
      <button type="button" class="min-h-11 rounded-xl bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]" @click="loadCatalogs">Reintentar</button>
    </div>

    <div
      v-if="cotizacionRegistrada && !showSuccessModal"
      class="mb-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center"
      role="status"
      aria-live="polite"
    >
      <p class="text-sm font-semibold text-green-900">Cotización N.º {{ cotizacionRegistrada.id }} registrada. El comprobante permanece disponible.</p>
      <button
        ref="reopenSuccessButton"
        type="button"
        class="min-h-11 rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        @click="reopenSuccessModal"
      >
        Ver comprobante
      </button>
    </div>

    <div class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div class="min-w-0 space-y-5">
        <section aria-labelledby="cotizacion-cliente-title" class="rounded-3xl border border-[#E3CFB4] bg-white p-4 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)] sm:p-5">
          <h2 id="cotizacion-cliente-title" class="mb-3 flex items-center gap-2 text-lg font-bold text-[#3A1C12]">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E3F0F1] text-[#22555C]" aria-hidden="true">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </span>
            Cliente
          </h2>
          <AutocompleteCliente
            v-model="clienteSeleccionado"
            :clientes="clientes"
            :disabled="catalogLoading || registering || Boolean(cotizacionRegistrada)"
            @create="openClienteModal"
          />
          <div v-if="clienteSeleccionado" aria-live="polite" class="mt-3 flex items-center gap-2 rounded-xl bg-[#E3F0F1] px-3 py-2.5 text-sm text-[#1B4349]">
            <svg class="h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
            <span class="min-w-0">Cliente seleccionado: <strong>{{ clienteSeleccionado.nombre }}</strong> · {{ clienteSeleccionado.celular }}</span>
          </div>
        </section>

        <CotizacionCarrito
          :items="carrito"
          @update-cantidad="actualizarCantidad"
          @update-precio="actualizarPrecioVenta"
          @remove="eliminarProducto"
          @abrir-modal-producto="abrirModalAgregar"
        />
      </div>

      <CotizacionResumen
        :numero-articulos="numeroArticulos"
        :total-centavos="totalCentavos"
        :ganancia-centavos="gananciaCentavos"
        :can-register="canRegister"
        :registering="registering"
        :error="cotizacionError"
        @register="registrarCotizacionConExito"
        @clear="limpiarConConfirmacion"
      />
    </div>

    <!-- Barra inferior (solo celular): total a la vista y acceso directo al resumen -->
    <div
      v-if="mostrarBarra"
      class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-[#E3CFB4] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_-12px_rgba(74,36,24,0.35)] lg:hidden"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium text-[#5C4033]">{{ numeroArticulos }} {{ numeroArticulos === 1 ? 'artículo' : 'artículos' }}</p>
        <p class="truncate text-xl font-bold leading-tight text-[#3A1C12]">{{ formatBs(totalCentavos) }}</p>
      </div>
      <button
        type="button"
        class="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#2F7079] to-[#22555C] px-5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(34,85,92,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22555C] focus-visible:ring-offset-2 active:scale-95 motion-reduce:active:scale-100"
        @click="irAlResumen"
      >
        Ver resumen
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>

    <ClienteFormModal
      :open="showClienteModal"
      :saving="savingCliente"
      :error="clienteMutationError"
      mode="create"
      :initial-values="{ nombre: '', celular: '' }"
      @submit="crearClienteRapido"
      @close="closeClienteModal"
    />

    <ModalAgregarProducto
      :open="showModalAgregar"
      :productos="productos"
      :disabled="catalogLoading || registering || Boolean(cotizacionRegistrada)"
      :saving-producto="savingProducto"
      :producto-mutation-error="productoMutationError"
      :producto-guardado="productoGuardado"
      @close="cerrarModalAgregar"
      @agregar="onAgregarProducto"
      @crear-producto="crearProductoRapido"
      @clear-producto-error="clearProductoError"
    />

    <CotizacionExitoModal
      :open="showSuccessModal"
      :cotizacion="cotizacionRegistrada"
      :error="printError"
      @close="closeSuccessModal"
      @print="imprimir"
      @new-quote="nuevaCotizacion"
    />
  </section>

  <CotizacionComprobante :snapshot="comprobante" />
</template>
