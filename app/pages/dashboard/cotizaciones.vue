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
  <section aria-labelledby="cotizaciones-title" class="no-print min-w-0">
    <VolverDashboard />
    <header class="mb-6">
      <p class="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Operaciones</p>
      <h1 id="cotizaciones-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Registro de Cotizaciones</h1>
      <p class="mt-2 text-sm text-gray-600">Selecciona un cliente y agrega productos para generar una cotización.</p>
    </header>

    <div v-if="catalogLoading" class="mb-5 flex items-center gap-3 rounded-xl border border-[#D4A574] bg-white p-4 text-sm text-gray-600" role="status">
      <svg class="h-5 w-5 animate-spin text-[#6B3A2A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
      </svg>
      Cargando clientes y productos...
    </div>

    <div v-else-if="catalogError" class="mb-5 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
      <p class="text-sm text-red-700">{{ catalogError }}</p>
      <button type="button" class="rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="loadCatalogs">Reintentar</button>
    </div>

    <div
      v-if="cotizacionRegistrada && !showSuccessModal"
      class="mb-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center"
      role="status"
      aria-live="polite"
    >
      <p class="text-sm font-semibold text-green-800">Cotización N.º {{ cotizacionRegistrada.id }} registrada. El comprobante permanece disponible.</p>
      <button
        ref="reopenSuccessButton"
        type="button"
        class="min-h-11 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-400"
        @click="reopenSuccessModal"
      >
        Ver comprobante
      </button>
    </div>

    <div class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div class="min-w-0 space-y-5">
        <section aria-labelledby="cotizacion-cliente-title" class="rounded-xl border border-[#D4A574] bg-white p-4 shadow-sm sm:p-5">
          <h2 id="cotizacion-cliente-title" class="mb-4 font-bold text-[#6B3A2A]">Cliente</h2>
          <AutocompleteCliente
            v-model="clienteSeleccionado"
            :clientes="clientes"
            :disabled="catalogLoading || registering || Boolean(cotizacionRegistrada)"
            @create="openClienteModal"
          />
          <div v-if="clienteSeleccionado" aria-live="polite" class="mt-3 rounded-lg bg-[#F5E6D3] px-3 py-2 text-sm text-[#6B3A2A]">
            Cliente seleccionado: <strong>{{ clienteSeleccionado.nombre }}</strong> · {{ clienteSeleccionado.celular }}
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
