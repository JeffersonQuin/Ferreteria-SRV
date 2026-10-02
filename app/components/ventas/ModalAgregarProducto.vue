<script setup lang="ts">
import AutocompleteProducto from '~/components/ventas/AutocompleteProducto.vue'
import type { Producto, ProductoPayload } from '~/composables/useProductos'
import { toCents } from '~/utils/money'

const props = defineProps<{
  open: boolean
  productos: Producto[]
  disabled?: boolean
  savingProducto?: boolean
  productoMutationError?: string | null
  productoGuardado?: Producto | null
}>()

const emit = defineEmits<{
  close: []
  agregar: [productoId: number, nombre: string, precioVentaCentavos: number, precioCostoCentavos: number, cantidad: number]
  crearProducto: [payload: ProductoPayload]
  clearProductoError: []
}>()

// ── Vista activa ─────────────────────────────────────────────────────────────
type Vista = 'seleccion' | 'crear'
const vistaActual = ref<Vista>('seleccion')

// ── Vista selección ──────────────────────────────────────────────────────────
const productoSeleccionado = ref<Producto | null>(null)
const cantidadStr = ref('')
const mostrarErrorCantidad = ref(false)
const dialogEl = ref<HTMLDivElement | null>(null)
const autocompleteInputRef = ref<HTMLInputElement | null>(null)

const cantidadNumerica = computed(() => {
  const n = Number(cantidadStr.value)
  return Number.isInteger(n) && n > 0 ? n : null
})

const canAccept = computed(() =>
  productoSeleccionado.value !== null && cantidadNumerica.value !== null
)

// ── Vista crear ──────────────────────────────────────────────────────────────
const formNombre = ref('')
const formDescripcion = ref('')
const formPrecioCosto = ref('')
const formPrecioVenta = ref('')
const formError = ref<string | null>(null)
const nombreInput = ref<HTMLInputElement | null>(null)
const cantidadInput = ref<HTMLInputElement | null>(null)

const visibleError = computed(() =>
  formError.value || props.productoMutationError || null
)

// ── Reset al abrir/cerrar ────────────────────────────────────────────────────
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    vistaActual.value = 'seleccion'
    productoSeleccionado.value = null
    cantidadStr.value = ''
    mostrarErrorCantidad.value = false
    resetFormCrear()
    nextTick(() => {
      const firstInput = dialogEl.value?.querySelector<HTMLInputElement>('input[type="text"]')
      firstInput?.focus()
    })
  }
})

// ── Cuando se guarda un producto exitosamente ────────────────────────────────
watch(() => props.productoGuardado, (nuevoProducto) => {
  if (nuevoProducto && vistaActual.value === 'crear') {
    productoSeleccionado.value = nuevoProducto
    vistaActual.value = 'seleccion'
    nextTick(() => {
      cantidadInput.value?.focus()
    })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function resetFormCrear() {
  formNombre.value = ''
  formDescripcion.value = ''
  formPrecioCosto.value = ''
  formPrecioVenta.value = ''
  formError.value = null
}

// ── Vista selección: acciones ────────────────────────────────────────────────
function intentarAceptar() {
  if (!productoSeleccionado.value) return
  if (cantidadNumerica.value === null) {
    mostrarErrorCantidad.value = true
    return
  }

  const producto = productoSeleccionado.value
  const precioVentaCentavos = toCents(producto.precio_venta)
  const precioCostoCentavos = toCents(producto.precio_costo)
  if (precioVentaCentavos === null || precioCostoCentavos === null) return

  emit('agregar', producto.id, producto.nombre, precioVentaCentavos, precioCostoCentavos, cantidadNumerica.value)
}

function onCantidadInput() {
  mostrarErrorCantidad.value = false
}

function cancelar() {
  emit('close')
}

// ── Navegación entre vistas ──────────────────────────────────────────────────
function irACrear() {
  resetFormCrear()
  emit('clearProductoError')
  vistaActual.value = 'crear'
  nextTick(() => {
    nombreInput.value?.focus()
  })
}

function volverASeleccion() {
  vistaActual.value = 'seleccion'
  emit('clearProductoError')
  nextTick(() => {
    const firstInput = dialogEl.value?.querySelector<HTMLInputElement>('input[type="text"]')
    firstInput?.focus()
  })
}

// ── Vista crear: validación y envío ─────────────────────────────────────────
function getValidatedPayload(): ProductoPayload | null {
  const nombre = formNombre.value.trim()
  const descripcion = formDescripcion.value.trim()
  const precioCostoRaw = String(formPrecioCosto.value).trim()
  const precioVentaRaw = String(formPrecioVenta.value).trim()

  if (!nombre) {
    formError.value = 'El nombre del producto es obligatorio.'
    return null
  }

  if (!precioCostoRaw || !precioVentaRaw) {
    formError.value = 'El costo unitario y el precio de venta son obligatorios.'
    return null
  }

  const precioCosto = Number(precioCostoRaw)
  const precioVenta = Number(precioVentaRaw)

  if (!Number.isFinite(precioCosto) || !Number.isFinite(precioVenta)) {
    formError.value = 'Los precios deben ser números válidos.'
    return null
  }

  if (precioCosto < 0 || precioVenta < 0) {
    formError.value = 'Los precios deben ser mayores o iguales a cero.'
    return null
  }

  return {
    nombre,
    descripcion: descripcion || null,
    precio_costo: precioCosto,
    precio_venta: precioVenta
  }
}

function submitCrear() {
  console.log('[ModalAgregarProducto] submitCrear called')
  if (props.savingProducto) {
    console.log('[ModalAgregarProducto] savingProducto is true, returning')
    return
  }
  formError.value = null
  const payload = getValidatedPayload()
  console.log('[ModalAgregarProducto] payload:', payload)
  if (!payload) {
    console.log('[ModalAgregarProducto] payload validation failed')
    return
  }
  console.log('[ModalAgregarProducto] emitting crearProducto with payload:', payload)
  emit('crearProducto', payload)
}

// ── Escape key ───────────────────────────────────────────────────────────────
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (vistaActual.value === 'crear') {
      volverASeleccion()
    } else {
      emit('close')
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        aria-modal="true"
        role="dialog"
        :aria-labelledby="vistaActual === 'seleccion' ? 'modal-agregar-titulo' : 'modal-crear-titulo'"
        @keydown="onKeydown"
        @click.self="cancelar"
      >
        <div
          ref="dialogEl"
          class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          @click.stop
        >

          <!-- ══════════════════════════════════════════════════ -->
          <!-- VISTA: SELECCIÓN                                   -->
          <!-- ══════════════════════════════════════════════════ -->
          <template v-if="vistaActual === 'seleccion'">
            <!-- Encabezado -->
            <div class="mb-5 flex items-center justify-between gap-3">
              <h2 id="modal-agregar-titulo" class="text-lg font-bold text-[#6B3A2A]">
                Agregar producto
              </h2>
              <div class="flex items-center gap-2">
                <!-- Botón "Nuevo producto" -->
                <button
                  type="button"
                  :disabled="disabled || savingProducto"
                  class="flex items-center gap-1.5 rounded-lg border border-[#6B3A2A] px-3 py-1.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-50"
                  @click="irACrear"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  Nuevo
                </button>
                <!-- Botón cerrar -->
                <button
                  type="button"
                  aria-label="Cerrar modal"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  @click="cancelar"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Autocomplete de producto -->
            <!-- El evento @create del autocomplete ahora abre la vista interna -->
            <div class="mb-4">
              <AutocompleteProducto
                v-model="productoSeleccionado"
                :productos="productos"
                :disabled="disabled"
                @create="irACrear"
              />
            </div>

            <!-- Campo cantidad -->
            <div class="mb-5">
              <label for="modal-cantidad" class="mb-1.5 block text-sm font-semibold text-gray-700">
                Cantidad
              </label>
              <input
                id="modal-cantidad"
                ref="cantidadInput"
                v-model="cantidadStr"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                placeholder="Ej: 3"
                :disabled="disabled"
                class="w-full rounded-lg border px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-100"
                :class="mostrarErrorCantidad
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                  : 'border-[#D4A574] focus:border-[#6B3A2A] focus:ring-[#D4A574]'"
                @input="onCantidadInput"
              >
              <p
                v-if="mostrarErrorCantidad"
                role="alert"
                class="mt-1.5 text-sm text-red-600"
              >
                Ingresa la cantidad
              </p>
            </div>

            <!-- Botones -->
            <div class="flex justify-end gap-3">
              <button
                type="button"
                class="min-h-11 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                @click="cancelar"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="min-h-11 rounded-lg bg-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canAccept || disabled"
                @click="intentarAceptar"
              >
                Aceptar
              </button>
            </div>
          </template>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- VISTA: CREAR PRODUCTO                              -->
          <!-- ══════════════════════════════════════════════════ -->
          <template v-else>
            <!-- Encabezado -->
            <div class="mb-5 flex items-center gap-3">
              <!-- Botón volver -->
              <button
                type="button"
                :disabled="savingProducto"
                aria-label="Volver a la lista de productos"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-50"
                @click="volverASeleccion"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                  <path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
                </svg>
              </button>
              <h2 id="modal-crear-titulo" class="flex-1 text-lg font-bold text-[#6B3A2A]">
                Nuevo producto
              </h2>
              <!-- Botón cerrar -->
              <button
                type="button"
                aria-label="Cerrar modal"
                :disabled="savingProducto"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-50"
                @click="cancelar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <!-- Formulario -->
            <form class="space-y-4" novalidate @submit.prevent="submitCrear">
              <!-- Nombre -->
              <div>
                <label for="crear-nombre" class="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                  id="crear-nombre"
                  ref="nombreInput"
                  v-model="formNombre"
                  type="text"
                  required
                  maxlength="150"
                  :disabled="savingProducto"
                  placeholder="Nombre del producto"
                  class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                >
              </div>

              <!-- Descripción -->
              <div>
                <label for="crear-descripcion" class="mb-1.5 block text-sm font-semibold text-gray-700">
                  Descripción <span class="font-normal text-gray-500">(opcional)</span>
                </label>
                <textarea
                  id="crear-descripcion"
                  v-model="formDescripcion"
                  rows="2"
                  maxlength="500"
                  :disabled="savingProducto"
                  placeholder="Descripción corta del producto"
                  class="w-full resize-none rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                />
              </div>

              <!-- Precios -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="crear-costo" class="mb-1.5 block text-sm font-semibold text-gray-700">
                    Costo unitario
                  </label>
                  <div class="relative">
                    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
                    <input
                      id="crear-costo"
                      v-model="formPrecioCosto"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      inputmode="decimal"
                      :disabled="savingProducto"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                    >
                  </div>
                </div>
                <div>
                  <label for="crear-venta" class="mb-1.5 block text-sm font-semibold text-gray-700">
                    Precio venta
                  </label>
                  <div class="relative">
                    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
                    <input
                      id="crear-venta"
                      v-model="formPrecioVenta"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      inputmode="decimal"
                      :disabled="savingProducto"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                    >
                  </div>
                </div>
              </div>

              <!-- Error -->
              <div v-if="visibleError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {{ visibleError }}
              </div>

              <!-- Botones -->
              <div class="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  :disabled="savingProducto"
                  class="min-h-11 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
                  @click="volverASeleccion"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="savingProducto"
                  class="inline-flex min-h-11 min-w-36 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg v-if="savingProducto" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
                  </svg>
                  {{ savingProducto ? 'Guardando...' : 'Guardar producto' }}
                </button>
              </div>
            </form>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
