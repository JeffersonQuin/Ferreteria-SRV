<script setup lang="ts">
import type { HistorialVenta } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  open: boolean
  venta: HistorialVenta | null
  deleting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const titleId = useId()
const descId = useId()
const panel = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const focusableSelector = [
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function requestClose() {
  if (!props.deleting) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!props.deleting) {
      event.preventDefault()
      requestClose()
    }
    return
  }
  if (event.key !== 'Tab') return

  const focusable = Array.from(panel.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
  if (!focusable.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && (active === last || !panel.value?.contains(active))) {
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
      // El foco inicial va en "Cancelar" para evitar eliminaciones accidentales con Enter.
      cancelButton.value?.focus()
      return
    }
    await nextTick()
    if (previouslyFocused && !previouslyFocused.hasAttribute('disabled')) previouslyFocused.focus()
    previouslyFocused = null
  }
)
</script>

<template>
  <div
    v-if="open && venta"
    class="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="alertdialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    :aria-describedby="descId"
    @click.self="requestClose"
    @keydown="onKeydown"
  >
    <div
      ref="panel"
      tabindex="-1"
      class="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
    >
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600" aria-hidden="true">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </div>
        <div>
          <h2 :id="titleId" class="text-xl font-bold text-[#6B3A2A]">¿Eliminar venta?</h2>
          <p :id="descId" class="mt-1 text-sm text-gray-600">
            Se eliminará la venta N.º {{ venta.id }} con todos sus productos. Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <dl class="mt-5 space-y-2 rounded-xl bg-[#F5E6D3] p-4 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Cliente</dt><dd class="text-right font-semibold">{{ venta.clienteNombre }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Total</dt><dd class="font-semibold">{{ formatBs(venta.totalCentavos) }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Pagado</dt><dd class="font-semibold">{{ formatBs(venta.pagadoCentavos) }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Estado</dt><dd class="font-semibold">{{ venta.estado }}</dd></div>
      </dl>

      <div v-if="error" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          ref="cancelButton"
          type="button"
          :disabled="deleting"
          class="min-h-11 rounded-lg border border-[#D4A574] px-4 py-2.5 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-60"
          @click="requestClose"
        >Cancelar</button>
        <button
          type="button"
          :disabled="deleting"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          @click="emit('confirm')"
        >
          <span v-if="deleting" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
          {{ deleting ? 'Eliminando...' : 'Sí, eliminar' }}
        </button>
      </div>
    </div>
  </div>
</template>
