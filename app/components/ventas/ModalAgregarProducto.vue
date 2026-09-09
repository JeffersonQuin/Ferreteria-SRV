<script setup lang="ts">
import AutocompleteProducto from '~/components/ventas/AutocompleteProducto.vue'
import type { Producto } from '~/composables/useProductos'
import { toCents } from '~/utils/money'

const props = defineProps<{
  open: boolean
  productos: Producto[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  close: []
  create: []
  agregar: [productoId: number, nombre: string, precioVentaCentavos: number, precioCostoCentavos: number, cantidad: number]
}>()

const productoSeleccionado = ref<Producto | null>(null)
const cantidadStr = ref('')
const mostrarErrorCantidad = ref(false)
const autocompleteFocus = ref<HTMLInputElement | null>(null)
const dialogEl = ref<HTMLDivElement | null>(null)

const cantidadNumerica = computed(() => {
  const n = Number(cantidadStr.value)
  return Number.isInteger(n) && n > 0 ? n : null
})

const canAccept = computed(() =>
  productoSeleccionado.value !== null && cantidadNumerica.value !== null
)

// Resetear estado interno cuando el modal se abre o cierra
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    productoSeleccionado.value = null
    cantidadStr.value = ''
    mostrarErrorCantidad.value = false
    nextTick(() => {
      // Mover foco al primer input del autocomplete al abrir
      const firstInput = dialogEl.value?.querySelector<HTMLInputElement>('input[type="text"]')
      firstInput?.focus()
    })
  }
})

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

function cancelar() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

function onCantidadInput() {
  mostrarErrorCantidad.value = false
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
        aria-labelledby="modal-agregar-titulo"
        @keydown="onKeydown"
        @click.self="cancelar"
      >
        <div
          ref="dialogEl"
          class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          @click.stop
        >
          <!-- Encabezado -->
          <div class="mb-5 flex items-center justify-between">
            <h2 id="modal-agregar-titulo" class="text-lg font-bold text-[#6B3A2A]">
              Agregar producto
            </h2>
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

          <!-- Autocomplete de producto -->
          <div class="mb-4">
            <AutocompleteProducto
              v-model="productoSeleccionado"
              :productos="productos"
              :disabled="disabled"
              @create="emit('create')"
            />
          </div>

          <!-- Campo cantidad -->
          <div class="mb-5">
            <label for="modal-cantidad" class="mb-1.5 block text-sm font-semibold text-gray-700">
              Cantidad
            </label>
            <input
              id="modal-cantidad"
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
