<script setup lang="ts">
import type { HistorialVenta } from '~/composables/useHistorialVentas'
import { formatBs, fromCents, toCents } from '~/utils/money'

const props = defineProps<{
  open: boolean
  venta: HistorialVenta | null
  paying: boolean
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [monto: string]
}>()

const titleId = useId()
const inputId = useId()
const panel = ref<HTMLElement | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)
const monto = ref('')
let previouslyFocused: HTMLElement | null = null

const saldoCentavos = computed(() => props.venta
  ? Math.max(props.venta.totalCentavos - props.venta.pagadoCentavos, 0)
  : 0
)
const montoCentavos = computed(() => toCents(monto.value))
const montoValido = computed(() => montoCentavos.value !== null
  && montoCentavos.value > 0
  && montoCentavos.value >= saldoCentavos.value
)
const cambioCentavos = computed(() => montoValido.value
  ? Math.max((montoCentavos.value ?? 0) - saldoCentavos.value, 0)
  : 0
)
const validationMessage = computed(() => {
  if (!monto.value.trim()) return null
  if (montoCentavos.value === null || montoCentavos.value <= 0) return 'Ingresa un monto recibido válido y mayor que cero.'
  if (montoCentavos.value < saldoCentavos.value) return `El monto debe cubrir el saldo de ${formatBs(saldoCentavos.value)}.`
  return null
})

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function requestClose() {
  if (!props.paying) emit('close')
}

function submit() {
  if (montoValido.value && !props.paying) emit('confirm', monto.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!props.paying) {
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
      monto.value = props.venta ? fromCents(saldoCentavos.value).toFixed(2) : ''
      await nextTick()
      amountInput.value?.focus()
      amountInput.value?.select()
      return
    }
    await nextTick()
    if (previouslyFocused && !previouslyFocused.hasAttribute('disabled')) previouslyFocused.focus()
    previouslyFocused = null
    monto.value = ''
  }
)
</script>

<template>
  <div
    v-if="open && venta"
    class="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="requestClose"
    @keydown="onKeydown"
  >
    <form ref="panel" tabindex="-1" class="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" @submit.prevent="submit">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Venta N.º {{ venta.id }}</p>
          <h2 :id="titleId" class="mt-1 text-xl font-bold text-[#6B3A2A]">Completar Pago</h2>
        </div>
        <button type="button" :disabled="paying" class="min-h-11 min-w-11 rounded-lg p-2 text-xl text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50" aria-label="Cerrar completar pago" @click="requestClose">×</button>
      </div>

      <dl class="mt-5 space-y-2 rounded-xl bg-[#F5E6D3] p-4 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Total de la venta</dt><dd class="font-semibold">{{ formatBs(venta.totalCentavos) }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Pagado acumulado</dt><dd class="font-semibold">{{ formatBs(venta.pagadoCentavos) }}</dd></div>
        <div class="flex justify-between gap-4 border-t border-[#D4A574] pt-2"><dt class="font-semibold text-[#6B3A2A]">Saldo pendiente</dt><dd class="font-bold text-[#6B3A2A]">{{ formatBs(saldoCentavos) }}</dd></div>
      </dl>

      <div class="mt-5">
        <label :for="inputId" class="mb-1.5 block text-sm font-semibold text-gray-700">Monto recibido</label>
        <input
          :id="inputId"
          ref="amountInput"
          v-model="monto"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          :disabled="paying"
          class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
          :aria-describedby="validationMessage ? `${inputId}-error` : undefined"
        >
        <p v-if="validationMessage" :id="`${inputId}-error`" role="alert" class="mt-2 text-sm text-red-600">{{ validationMessage }}</p>
        <p v-else-if="cambioCentavos > 0" class="mt-2 text-sm font-semibold text-green-700">Cambio estimado: {{ formatBs(cambioCentavos) }}</p>
      </div>

      <div v-if="error" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" :disabled="paying" class="min-h-11 rounded-lg border border-[#D4A574] px-4 py-2.5 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-60" @click="requestClose">Cancelar</button>
        <button type="submit" :disabled="!montoValido || paying" class="min-h-11 rounded-lg bg-[#6B3A2A] px-4 py-2.5 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60">{{ paying ? 'Confirmando...' : 'Confirmar Pago' }}</button>
      </div>
    </form>
  </div>
</template>
