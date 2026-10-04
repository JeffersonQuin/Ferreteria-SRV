<script setup lang="ts">
import type { CotizacionRegistrada } from '~/composables/useCotizaciones'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  open: boolean
  cotizacion: CotizacionRegistrada | null
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  print: []
  newQuote: []
}>()

const titleId = useId()
const dialogPanel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function requestClose() {
  emit('close')
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
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

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      closeButton.value?.focus()
      return
    }

    await nextTick()
    if (previouslyFocused && !previouslyFocused.hasAttribute('disabled')) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }
)
</script>

<template>
  <div
    v-if="open && cotizacion"
    class="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="requestClose"
    @keydown="onDialogKeydown"
  >
    <div ref="dialogPanel" tabindex="-1" class="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700" aria-hidden="true">✓</div>
        <button
          ref="closeButton"
          type="button"
          class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          aria-label="Cerrar confirmación"
          @click="requestClose"
        >
          ×
        </button>
      </div>

      <p role="status" aria-live="polite" class="sr-only">La cotización N.º {{ cotizacion.id }} fue registrada exitosamente.</p>
      <h2 :id="titleId" class="mt-4 text-xl font-bold text-[#6B3A2A]">¡Cotización registrada exitosamente!</h2>
      <dl class="mt-5 space-y-2 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-gray-500">Número de cotización</dt><dd class="font-semibold">N.º {{ cotizacion.id }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-500">Cliente</dt><dd class="text-right font-semibold">{{ cotizacion.clienteNombre }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-500">Total</dt><dd class="font-semibold">{{ formatBs(cotizacion.totalCentavos) }}</dd></div>
      </dl>

      <div v-if="error" role="alert" class="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" class="min-h-11 rounded-lg bg-[#6B3A2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="emit('print')">Imprimir PDF</button>
        <button type="button" class="min-h-11 rounded-lg border border-[#D4A574] px-4 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="emit('newQuote')">Nueva Cotización</button>
      </div>
    </div>
  </div>
</template>
