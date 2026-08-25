<script setup lang="ts">
import type { ProductoPayload } from '~/composables/useProductos'

type FormMode = 'create' | 'edit'

type ProductoFormValues = {
  nombre: string
  descripcion: string
  precioCosto: string | number
  precioVenta: string | number
}

const props = withDefaults(defineProps<{
  open: boolean
  saving: boolean
  error: string | null
  mode: FormMode
  initialValues?: ProductoFormValues
}>(), {
  initialValues: () => ({
    nombre: '',
    descripcion: '',
    precioCosto: '',
    precioVenta: ''
  })
})

const emit = defineEmits<{
  submit: [payload: ProductoPayload]
  close: []
}>()

const form = reactive<ProductoFormValues>({
  nombre: '',
  descripcion: '',
  precioCosto: '',
  precioVenta: ''
})
const formError = ref<string | null>(null)
const showExternalError = ref(true)
const nameInput = ref<HTMLInputElement | null>(null)
const dialogPanel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const formTitle = computed(() => props.mode === 'edit' ? 'Editar producto' : 'Nuevo producto')
const submitLabel = computed(() => props.mode === 'edit' ? 'Guardar cambios' : 'Guardar producto')
const visibleError = computed(() => formError.value || (showExternalError.value ? props.error : null))

function resetForm() {
  form.nombre = props.initialValues.nombre
  form.descripcion = props.initialValues.descripcion
  form.precioCosto = props.initialValues.precioCosto
  form.precioVenta = props.initialValues.precioVenta
  formError.value = null
  showExternalError.value = true
}

function requestClose() {
  if (props.saving) return
  emit('close')
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    requestClose()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = Array.from(dialogPanel.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
  if (!focusable.length) {
    event.preventDefault()
    dialogPanel.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !dialogPanel.value?.contains(active))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && (active === last || !dialogPanel.value?.contains(active))) {
    event.preventDefault()
    first?.focus()
  }
}

function getValidatedPayload(): ProductoPayload | null {
  const nombre = form.nombre.trim()
  const descripcion = form.descripcion.trim()
  const precioCostoRaw = String(form.precioCosto).trim()
  const precioVentaRaw = String(form.precioVenta).trim()

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

function submitForm() {
  if (props.saving) return

  formError.value = null
  const payload = getValidatedPayload()
  if (!payload) return

  emit('submit', payload)
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      resetForm()
      await nextTick()
      nameInput.value?.focus()
      return
    }

    await nextTick()
    previouslyFocused?.focus()
    previouslyFocused = null
  }
)

watch(
  () => props.initialValues,
  () => {
    if (props.open) resetForm()
  },
  { deep: true }
)

watch(
  () => [form.nombre, form.descripcion, form.precioCosto, form.precioVenta],
  () => {
    formError.value = null
    showExternalError.value = false
  }
)

watch(
  () => props.error,
  () => {
    showExternalError.value = true
  }
)
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="producto-form-title"
    @click.self="requestClose"
    @keydown="onDialogKeydown"
  >
    <div ref="dialogPanel" tabindex="-1" class="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="producto-form-title" class="text-xl font-bold text-[#6B3A2A]">{{ formTitle }}</h2>
          <p class="mt-1 text-sm text-gray-500">Completa los datos y precios del producto.</p>
        </div>
        <button type="button" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4A574]" aria-label="Cerrar diálogo" :disabled="saving" @click="requestClose">×</button>
      </div>

      <form class="space-y-4" novalidate @submit.prevent="submitForm">
        <div>
          <label for="producto-nombre" class="mb-1.5 block text-sm font-semibold text-gray-700">Nombre</label>
          <input
            id="producto-nombre"
            ref="nameInput"
            v-model="form.nombre"
            type="text"
            required
            maxlength="150"
            class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
            placeholder="Nombre del producto"
          >
        </div>

        <div>
          <label for="producto-descripcion" class="mb-1.5 block text-sm font-semibold text-gray-700">Descripción <span class="font-normal text-gray-500">(opcional)</span></label>
          <textarea
            id="producto-descripcion"
            v-model="form.descripcion"
            rows="3"
            maxlength="500"
            class="w-full resize-y rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
            placeholder="Descripción corta del producto"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="producto-costo" class="mb-1.5 block text-sm font-semibold text-gray-700">Costo Unitario</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
              <input
                id="producto-costo"
                v-model="form.precioCosto"
                type="number"
                required
                min="0"
                step="0.01"
                inputmode="decimal"
                class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                placeholder="0.00"
              >
            </div>
          </div>

          <div>
            <label for="producto-venta" class="mb-1.5 block text-sm font-semibold text-gray-700">Precio Venta</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
              <input
                id="producto-venta"
                v-model="form.precioVenta"
                type="number"
                required
                min="0"
                step="0.01"
                inputmode="decimal"
                class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                placeholder="0.00"
              >
            </div>
          </div>
        </div>

        <div v-if="visibleError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {{ visibleError }}
        </div>

        <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4A574]" :disabled="saving" @click="requestClose">Cancelar</button>
          <button type="submit" class="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60" :disabled="saving">
            <svg v-if="saving" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
            </svg>
            {{ saving ? 'Guardando...' : submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
