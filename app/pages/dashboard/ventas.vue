<script setup lang="ts">
import AutocompleteCliente from '~/components/ventas/AutocompleteCliente.vue'
import ClienteFormModal from '~/components/clientes/ClienteFormModal.vue'
import ModalAgregarProducto from '~/components/ventas/ModalAgregarProducto.vue'
import VentaCarrito from '~/components/ventas/VentaCarrito.vue'
import VentaComprobante from '~/components/ventas/VentaComprobante.vue'
import VentaExitoModal from '~/components/ventas/VentaExitoModal.vue'
import VentaResumen from '~/components/ventas/VentaResumen.vue'
import type { ClientePayload } from '~/composables/useClientes'
import type { Producto, ProductoPayload } from '~/composables/useProductos'
import { formatBs } from '~/utils/money'

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
  carrito,
  descuento,
  montoIngresado,
  registering,
  error: ventaError,
  ventaRegistrada,
  comprobante,
  numeroArticulos,
  totalCentavos,
  descuentoCentavos,
  totalConDescuentoCentavos,
  gananciaCentavos,
  montoValido,
  estadoPago,
  pagoMensaje,
  canRegister,
  tieneDatosSinGuardar,
  agregarProductoDirecto,
  actualizarCantidad,
  actualizarPrecioVenta,
  eliminarProducto,
  limpiar,
  registrarVenta
} = useVentas()

const showClienteModal = ref(false)
const showSuccessModal = ref(false)
const showModalAgregar = ref(false)
const productoGuardado = ref<Producto | null>(null)
const printError = ref<string | null>(null)
const reopenSuccessButton = ref<HTMLButtonElement | null>(null)
const catalogLoading = computed(() => loadingClientes.value || loadingProductos.value)
const catalogError = computed(() => clientesError.value || productosError.value)

// Barra fija inferior (solo celular): resume el total y lleva al pago.
const mostrarBarra = computed(() => carrito.value.length > 0 && !ventaRegistrada.value)

function irAlPago() {
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('resumen-pago')?.scrollIntoView({
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

// ── Creación rápida de producto (desde ModalAgregarProducto) ─────────────────
async function crearProductoRapido(payload: ProductoPayload) {
  console.log('[ventas.vue] crearProductoRapido called with payload:', payload)
  productoGuardado.value = null
  const created = await createProducto(payload)
  console.log('[ventas.vue] createProducto result:', created)
  if (!created) return
  productoGuardado.value = created
  console.log('[ventas.vue] productoGuardado set to:', created)
}

// ── Modal agregar producto ────────────────────────────────────────────────────
function abrirModalAgregar() {
  if (catalogLoading.value || registering.value || ventaRegistrada.value) return
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

// ── Venta ─────────────────────────────────────────────────────────────────────
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
  <section
    aria-labelledby="ventas-title"
    class="no-print min-w-0"
    :class="mostrarBarra ? 'pb-28 lg:pb-0' : ''"
  >
    <VolverDashboard
      titulo="Ventas"
      titulo-id="ventas-title"
      descripcion="Selecciona un cliente, agrega productos al carrito y registra el pago."
      tono="arena"
    >
      <template #icon>
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
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
      v-if="ventaRegistrada && !showSuccessModal"
      class="mb-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center"
      role="status"
      aria-live="polite"
    >
      <p class="text-sm font-semibold text-green-900">Venta N.º {{ ventaRegistrada.id }} registrada. El comprobante permanece disponible.</p>
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

        <!-- Sección Cliente -->
        <section aria-labelledby="cliente-section-title" class="rounded-3xl border border-[#E3CFB4] bg-white p-4 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)] sm:p-5">
          <h2 id="cliente-section-title" class="mb-3 flex items-center gap-2 text-lg font-bold text-[#3A1C12]">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6D3] text-[#6B3A2A]" aria-hidden="true">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </span>
            Cliente
          </h2>
          <AutocompleteCliente
            v-model="clienteSeleccionado"
            :clientes="clientes"
            :disabled="catalogLoading || registering || Boolean(ventaRegistrada)"
            @create="openClienteModal"
          />
          <div v-if="clienteSeleccionado" aria-live="polite" class="mt-3 flex items-center gap-2 rounded-xl bg-[#F5E6D3] px-3 py-2.5 text-sm text-[#4A2418]">
            <svg class="h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
            <span class="min-w-0">Cliente seleccionado: <strong>{{ clienteSeleccionado.nombre }}</strong> · {{ clienteSeleccionado.celular }}</span>
          </div>
        </section>

        <!-- Carrito (lleva el botón para agregar productos) -->
        <VentaCarrito
          :items="carrito"
          @update-cantidad="actualizarCantidad"
          @update-precio="actualizarPrecioVenta"
          @remove="eliminarProducto"
          @abrir-modal-producto="abrirModalAgregar"
        />
      </div>

      <VentaResumen
        :numero-articulos="numeroArticulos"
        :total-centavos="totalCentavos"
        :descuento="descuento"
        :total-con-descuento-centavos="totalConDescuentoCentavos"
        :ganancia-centavos="gananciaCentavos"
        :monto-ingresado="montoIngresado"
        :monto-valido="montoValido"
        :estado="estadoPago"
        :pago-mensaje="pagoMensaje"
        :can-register="canRegister"
        :registering="registering"
        :error="ventaError"
        @update:descuento="descuento = $event"
        @update:monto-ingresado="montoIngresado = $event"
        @register="registrarVentaConExito"
        @clear="limpiarConConfirmacion"
      />
    </div>

    <!-- Barra inferior (solo celular): total a la vista y acceso directo al pago -->
    <div
      v-if="mostrarBarra"
      class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-[#E3CFB4] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_-12px_rgba(74,36,24,0.35)] lg:hidden"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium text-[#5C4033]">{{ numeroArticulos }} {{ numeroArticulos === 1 ? 'artículo' : 'artículos' }}</p>
        <p class="truncate text-xl font-bold leading-tight text-[#3A1C12]">{{ formatBs(totalConDescuentoCentavos) }}</p>
      </div>
      <button
        type="button"
        class="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#6B3A2A] to-[#4A2418] px-5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(74,36,24,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 active:scale-95 motion-reduce:active:scale-100"
        @click="irAlPago"
      >
        Ver pago
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>

    <!-- Modales -->
    <ClienteFormModal
      :open="showClienteModal"
      :saving="savingCliente"
      :error="clienteMutationError"
      mode="create"
      :initial-values="{ nombre: '', celular: '' }"
      @submit="crearClienteRapido"
      @close="closeClienteModal"
    />

    <!-- Modal para seleccionar / crear producto y agregar al carrito -->
    <ModalAgregarProducto
      :open="showModalAgregar"
      :productos="productos"
      :disabled="catalogLoading || registering || Boolean(ventaRegistrada)"
      :saving-producto="savingProducto"
      :producto-mutation-error="productoMutationError"
      :producto-guardado="productoGuardado"
      @close="cerrarModalAgregar"
      @agregar="onAgregarProducto"
      @crear-producto="crearProductoRapido"
      @clear-producto-error="clearProductoError"
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
