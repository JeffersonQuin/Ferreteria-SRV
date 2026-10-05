<script setup lang="ts">
import AutocompleteProducto from '~/components/ventas/AutocompleteProducto.vue'
import type { Producto, ProductoPayload } from '~/composables/useProductos'
import { formatBs, toCents } from '~/utils/money'

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

const precioSeleccionado = computed(() => {
  if (!productoSeleccionado.value) return null
  const centavos = toCents(productoSeleccionado.value.precio_venta)
  return centavos === null ? null : formatBs(centavos)
})

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

// Botones − / + del selector de cantidad (solo mueven el mismo campo de texto).
function cambiarCantidad(delta: number) {
  const actual = cantidadNumerica.value ?? 0
  cantidadStr.value = String(Math.max(1, actual + delta))
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
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
        aria-modal="true"
        role="dialog"
        :aria-labelledby="vistaActual === 'seleccion' ? 'modal-agregar-titulo' : 'modal-crear-titulo'"
        @keydown="onKeydown"
        @click.self="cancelar"
      >
        <div
          ref="dialogEl"
          class="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:p-6"
          @click.stop
        >
          <span class="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-[#E3CFB4] sm:hidden" aria-hidden="true" />

          <!-- ══════════════════════════════════════════════════ -->
          <!-- VISTA: SELECCIÓN                                   -->
          <!-- ══════════════════════════════════════════════════ -->
          <template v-if="vistaActual === 'seleccion'">
            <div class="mb-5 flex items-center justify-between gap-3">
              <h2 id="modal-agregar-titulo" class="text-xl font-bold text-[#3A1C12]">
                Agregar producto
              </h2>
              <button
                type="button"
                aria-label="Cerrar modal"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
                @click="cancelar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div class="mb-3">
              <AutocompleteProducto
                v-model="productoSeleccionado"
                :productos="productos"
                :disabled="disabled"
                @create="irACrear"
              />
            </div>

            <!-- Producto elegido: nombre y precio a la vista -->
            <div
              v-if="productoSeleccionado"
              aria-live="polite"
              class="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#FBE6BE] px-3 py-2.5"
            >
              <span class="min-w-0 truncate text-sm font-semibold text-[#4A2418]">{{ productoSeleccionado.nombre }}</span>
              <span v-if="precioSeleccionado" class="shrink-0 text-base font-bold text-[#4A2418]">{{ precioSeleccionado }}</span>
            </div>

            <button
              type="button"
              :disabled="disabled || savingProducto"
              class="mb-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#A9784A] px-4 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-50"
              @click="irACrear"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              ¿No está en la lista? Crear producto nuevo
            </button>

            <!-- Cantidad con − / + -->
            <div class="mb-6">
              <label for="modal-cantidad" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
                Cantidad
              </label>
              <div class="flex items-stretch gap-2">
                <button
                  type="button"
                  :disabled="disabled"
                  aria-label="Disminuir cantidad"
                  class="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-[#A9784A] text-2xl font-bold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="cambiarCantidad(-1)"
                >−</button>
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
                  class="min-h-[3.25rem] w-full min-w-0 rounded-xl border px-3 text-center text-xl font-semibold text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 disabled:bg-gray-100"
                  :class="mostrarErrorCantidad
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                    : 'border-[#A9784A] focus:border-[#6B3A2A] focus:ring-[#D4A574]'"
                  @input="onCantidadInput"
                >
                <button
                  type="button"
                  :disabled="disabled"
                  aria-label="Aumentar cantidad"
                  class="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-[#A9784A] text-2xl font-bold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="cambiarCantidad(1)"
                >+</button>
              </div>
              <p
                v-if="mostrarErrorCantidad"
                role="alert"
                class="mt-1.5 text-sm text-red-700"
              >
                Ingresa la cantidad
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="min-h-[3.25rem] rounded-xl border border-gray-300 px-5 text-base font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
                @click="cancelar"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="min-h-[3.25rem] rounded-xl bg-gradient-to-br from-[#6B3A2A] to-[#4A2418] px-5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(74,36,24,0.7)] hover:from-[#7A4634] hover:to-[#5A2F21] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                :disabled="!canAccept || disabled"
                @click="intentarAceptar"
              >
                Agregar
              </button>
            </div>
          </template>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- VISTA: CREAR PRODUCTO                              -->
          <!-- ══════════════════════════════════════════════════ -->
          <template v-else>
            <div class="mb-5 flex items-center gap-2">
              <button
                type="button"
                :disabled="savingProducto"
                aria-label="Volver a la lista de productos"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-50"
                @click="volverASeleccion"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                  <path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
                </svg>
              </button>
              <h2 id="modal-crear-titulo" class="flex-1 text-xl font-bold text-[#3A1C12]">
                Nuevo producto
              </h2>
              <button
                type="button"
                aria-label="Cerrar modal"
                :disabled="savingProducto"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-50"
                @click="cancelar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form class="space-y-4" novalidate @submit.prevent="submitCrear">
              <div>
                <label for="crear-nombre" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
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
                  class="min-h-[3.25rem] w-full rounded-xl border border-[#A9784A] px-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                >
              </div>

              <div>
                <label for="crear-descripcion" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
                  Descripción <span class="font-normal text-[#5C4033]">(opcional)</span>
                </label>
                <textarea
                  id="crear-descripcion"
                  v-model="formDescripcion"
                  rows="2"
                  maxlength="500"
                  :disabled="savingProducto"
                  placeholder="Descripción corta del producto"
                  class="w-full resize-none rounded-xl border border-[#A9784A] px-3 py-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="crear-costo" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
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
                      class="min-h-[3.25rem] w-full rounded-xl border border-[#A9784A] pl-10 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                    >
                  </div>
                </div>
                <div>
                  <label for="crear-venta" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
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
                      class="min-h-[3.25rem] w-full rounded-xl border border-[#A9784A] pl-10 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                    >
                  </div>
                </div>
              </div>

              <div v-if="visibleError" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ visibleError }}
              </div>

              <div class="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  :disabled="savingProducto"
                  class="min-h-[3.25rem] rounded-xl border border-gray-300 px-5 text-base font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
                  @click="volverASeleccion"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="savingProducto"
                  class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#6B3A2A] to-[#4A2418] px-4 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(74,36,24,0.7)] hover:from-[#7A4634] hover:to-[#5A2F21] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  <svg v-if="savingProducto" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
                  </svg>
                  {{ savingProducto ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
