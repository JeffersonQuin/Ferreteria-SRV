<script setup lang="ts">
import ClienteFormModal from '~/components/clientes/ClienteFormModal.vue'
import ProductoFormModal from '~/components/productos/ProductoFormModal.vue'
import AutocompleteCliente from '~/components/ventas/AutocompleteCliente.vue'
import AutocompleteProducto from '~/components/ventas/AutocompleteProducto.vue'
import VentaCarrito from '~/components/ventas/VentaCarrito.vue'
import VentaComprobante from '~/components/ventas/VentaComprobante.vue'
import VentaExitoModal from '~/components/ventas/VentaExitoModal.vue'
import VentaResumen from '~/components/ventas/VentaResumen.vue'
import type { ClientePayload } from '~/composables/useClientes'
import type { ProductoPayload } from '~/composables/useProductos'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Registro de Ventas - Ferretería SRV' })

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
  productoSeleccionado,
  cantidad,
  carrito,
  montoIngresado,
  registering,
  error: ventaError,
  ventaRegistrada,
  comprobante,
  numeroArticulos,
  totalCentavos,
  gananciaCentavos,
  montoValido,
  estadoPago,
  pagoMensaje,
  canRegister,
  tieneDatosSinGuardar,
  agregarProducto,
  actualizarCantidad,
  eliminarProducto,
  limpiar,
  registrarVenta
} = useVentas()

const showClienteModal = ref(false)
const showProductoModal = ref(false)
const showSuccessModal = ref(false)
const printError = ref<string | null>(null)
const reopenSuccessButton = ref<HTMLButtonElement | null>(null)
const catalogLoading = computed(() => loadingClientes.value || loadingProductos.value)
const catalogError = computed(() => clientesError.value || productosError.value)
const cantidadValida = computed(() => Number.isInteger(cantidad.value) && cantidad.value > 0)
const canAddProduct = computed(() =>
  Boolean(productoSeleccionado.value)
  && cantidadValida.value
  && !catalogLoading.value
  && !registering.value
  && !ventaRegistrada.value
)

async function loadCatalogs() {
  await Promise.all([fetchClientes(), fetchProductos()])
}

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

function openProductoModal() {
  clearProductoError()
  showProductoModal.value = true
}

function closeProductoModal() {
  if (savingProducto.value) return
  showProductoModal.value = false
  clearProductoError()
}

async function crearProductoRapido(payload: ProductoPayload) {
  const created = await createProducto(payload)
  if (!created) return
  productoSeleccionado.value = created
  closeProductoModal()
}

function limpiarConConfirmacion() {
  if (ventaRegistrada.value) return
  if (tieneDatosSinGuardar.value && !window.confirm('¿Deseas descartar todos los datos de esta venta?')) return
  limpiar()
}

async function registrarVentaConExito() {
  const registered = await registrarVenta()
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

function nuevaVenta() {
  showSuccessModal.value = false
  printError.value = null
  limpiar()
}

async function imprimir() {
  if (!comprobante.value) {
    printError.value = 'No se encontró el comprobante de esta venta.'
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
    console.error('[Ventas] No fue posible imprimir', cause)
    printError.value = 'No fue posible abrir la impresión. Inténtalo nuevamente o revisa la configuración del navegador.'
  }
}

onMounted(loadCatalogs)
</script>

<template>
  <section aria-labelledby="ventas-title" class="no-print min-w-0">
    <header class="mb-6">
      <p class="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Operaciones</p>
      <h1 id="ventas-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Registro de Ventas</h1>
      <p class="mt-2 text-sm text-gray-600">Selecciona un cliente, agrega productos y registra el pago.</p>
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
      v-if="ventaRegistrada && !showSuccessModal"
      class="mb-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center"
      role="status"
      aria-live="polite"
    >
      <p class="text-sm font-semibold text-green-800">Venta N.º {{ ventaRegistrada.id }} registrada. El comprobante permanece disponible.</p>
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
        <section aria-labelledby="seleccion-title" class="rounded-xl border border-[#D4A574] bg-white p-4 shadow-sm sm:p-5">
          <h2 id="seleccion-title" class="mb-4 font-bold text-[#6B3A2A]">Cliente y productos</h2>
          <AutocompleteCliente
            v-model="clienteSeleccionado"
            :clientes="clientes"
            :disabled="catalogLoading || registering || Boolean(ventaRegistrada)"
            @create="openClienteModal"
          />

          <div v-if="clienteSeleccionado" aria-live="polite" class="mt-3 rounded-lg bg-[#F5E6D3] px-3 py-2 text-sm text-[#6B3A2A]">
            Cliente seleccionado: <strong>{{ clienteSeleccionado.nombre }}</strong> · {{ clienteSeleccionado.celular }}
          </div>

          <div class="mt-5 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
            <AutocompleteProducto
              v-model="productoSeleccionado"
              :productos="productos"
              :disabled="catalogLoading || registering || Boolean(ventaRegistrada)"
              @create="openProductoModal"
            />
            <div>
              <label for="cantidad-producto" class="mb-1.5 block text-sm font-semibold text-gray-700">Cantidad</label>
              <input
                id="cantidad-producto"
                v-model.number="cantidad"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                :disabled="registering || Boolean(ventaRegistrada)"
                class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
              >
            </div>
            <button
              type="button"
              class="min-h-11 rounded-lg bg-[#6B3A2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!canAddProduct"
              @click="agregarProducto"
            >
              Agregar al Carrito
            </button>
          </div>
          <p v-if="!cantidadValida" role="alert" class="mt-2 text-sm text-red-600">La cantidad debe ser un entero mayor que cero.</p>
        </section>

        <VentaCarrito :items="carrito" @update-cantidad="actualizarCantidad" @remove="eliminarProducto" />
      </div>

      <VentaResumen
        :numero-articulos="numeroArticulos"
        :total-centavos="totalCentavos"
        :ganancia-centavos="gananciaCentavos"
        :monto-ingresado="montoIngresado"
        :monto-valido="montoValido"
        :estado="estadoPago"
        :pago-mensaje="pagoMensaje"
        :can-register="canRegister"
        :registering="registering"
        :error="ventaError"
        @update:monto-ingresado="montoIngresado = $event"
        @register="registrarVentaConExito"
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
    <ProductoFormModal
      :open="showProductoModal"
      :saving="savingProducto"
      :error="productoMutationError"
      mode="create"
      :initial-values="{ nombre: '', descripcion: '', precioCosto: '', precioVenta: '' }"
      @submit="crearProductoRapido"
      @close="closeProductoModal"
    />

    <VentaExitoModal
      :open="showSuccessModal"
      :venta="ventaRegistrada"
      :error="printError"
      @close="closeSuccessModal"
      @print="imprimir"
      @new-sale="nuevaVenta"
    />
  </section>

  <VentaComprobante :snapshot="comprobante" />
</template>
