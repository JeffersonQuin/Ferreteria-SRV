<script setup lang="ts">
import type { HistorialCotizacion } from '~/composables/useHistorialCotizaciones'
import { formatBs, toCents } from '~/utils/money'

type EstadoPago = 'Completo' | 'Pendiente' | 'No pagado'

const props = defineProps<{
  open: boolean
  cotizacion: HistorialCotizacion | null
  converting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [descuento: string, montoPagado: string]
}>()

const titleId = useId()
const descuentoId = useId()
const montoId = useId()
const panel = ref<HTMLElement | null>(null)
const montoInput = ref<HTMLInputElement | null>(null)
const descuento = ref('')
const montoPagado = ref('')
let previouslyFocused: HTMLElement | null = null

/**
 * Deja solo números: dígitos y un único punto decimal (la coma se toma como punto),
 * con un máximo de 2 decimales. Descarta letras, símbolos y signos, también al pegar.
 */
function sanitizeDecimal(raw: string) {
  const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned.slice(0, 10)
  const entero = cleaned.slice(0, firstDot).slice(0, 10)
  const decimales = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
  return `${entero}.${decimales}`
}

function onDecimalInput(target: 'descuento' | 'monto', event: Event) {
  const input = event.target as HTMLInputElement
  const sanitized = sanitizeDecimal(input.value)
  // Se reescribe el valor del input porque, si el texto filtrado coincide con el
  // valor anterior, Vue no vuelve a renderizar y la tecla inválida quedaría visible.
  if (input.value !== sanitized) input.value = sanitized
  if (target === 'descuento') descuento.value = sanitized
  else montoPagado.value = sanitized
}

const totalCentavos = computed(() => props.cotizacion?.totalCentavos ?? 0)

// Descuento vacío equivale a 0; cualquier otro valor debe ser válido.
const descuentoCentavos = computed(() =>
  descuento.value.trim() === '' ? 0 : toCents(descuento.value)
)
const descuentoError = computed(() => {
  if (descuentoCentavos.value === null || descuentoCentavos.value < 0) {
    return 'Ingresa un descuento válido, mayor o igual a cero.'
  }
  if (descuentoCentavos.value > totalCentavos.value) {
    return `El descuento no puede superar el total de ${formatBs(totalCentavos.value)}.`
  }
  return null
})
const descuentoValido = computed(() => descuentoError.value === null)
const descuentoAplicadoCentavos = computed(() =>
  descuentoValido.value ? (descuentoCentavos.value ?? 0) : 0
)

// Total que debe pagar el cliente: se actualiza en vivo al escribir el descuento.
const totalNetoCentavos = computed(() =>
  Math.max(totalCentavos.value - descuentoAplicadoCentavos.value, 0)
)

const montoCentavos = computed(() => toCents(montoPagado.value))
const montoValido = computed(() => montoCentavos.value !== null && montoCentavos.value >= 0)

const cambioCentavos = computed(() =>
  montoValido.value ? Math.max((montoCentavos.value ?? 0) - totalNetoCentavos.value, 0) : 0
)
const saldoPendienteCentavos = computed(() =>
  montoValido.value
    ? Math.max(totalNetoCentavos.value - (montoCentavos.value ?? 0), 0)
    : totalNetoCentavos.value
)
const estadoPago = computed<EstadoPago>(() => {
  const monto = montoCentavos.value ?? 0
  if (monto === 0) return 'No pagado'
  if (monto >= totalNetoCentavos.value) return 'Completo'
  return 'Pendiente'
})

// Mismos mensajes que el resumen de pago del registro de ventas.
const pagoMensaje = computed(() => {
  if (!montoValido.value) return 'Ingresa un monto pagado válido, mayor o igual a cero.'
  if (montoCentavos.value === 0) return `Saldo pendiente: ${formatBs(totalNetoCentavos.value)}`
  if (cambioCentavos.value > 0) return `Devolver cambio: ${formatBs(cambioCentavos.value)}`
  if (montoCentavos.value === totalNetoCentavos.value) return 'Pago justo exacto'
  return `Saldo pendiente: ${formatBs(saldoPendienteCentavos.value)}`
})
const messageClass = computed(() => {
  if (!montoValido.value) return 'border-red-200 bg-red-50 text-red-700'
  if (estadoPago.value === 'Completo') return 'border-green-200 bg-green-50 text-green-700'
  return 'border-orange-200 bg-orange-50 text-orange-700'
})

const canSubmit = computed(() => descuentoValido.value && montoValido.value && !props.converting)

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function requestClose() {
  if (!props.converting) emit('close')
}

function submit() {
  if (canSubmit.value) emit('confirm', descuento.value, montoPagado.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!props.converting) {
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
      descuento.value = ''
      montoPagado.value = ''
      await nextTick()
      montoInput.value?.focus()
      return
    }
    await nextTick()
    if (previouslyFocused && !previouslyFocused.hasAttribute('disabled')) previouslyFocused.focus()
    previouslyFocused = null
    descuento.value = ''
    montoPagado.value = ''
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
    @keydown="onKeydown"
  >
    <form
      ref="panel"
      tabindex="-1"
      class="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      @submit.prevent="submit"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Cotización N.º {{ cotizacion.id }}</p>
          <h2 :id="titleId" class="mt-1 text-xl font-bold text-[#6B3A2A]">Convertir a venta</h2>
        </div>
        <button
          type="button"
          :disabled="converting"
          class="min-h-11 min-w-11 rounded-lg p-2 text-xl text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
          aria-label="Cerrar conversión a venta"
          @click="requestClose"
        >×</button>
      </div>

      <dl class="mt-5 space-y-2 rounded-xl bg-[#F5E6D3] p-4 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Cliente</dt><dd class="text-right font-semibold">{{ cotizacion.clienteNombre }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-gray-600">Total de la cotización</dt><dd class="font-semibold">{{ formatBs(totalCentavos) }}</dd></div>
        <div
          v-if="descuentoAplicadoCentavos > 0"
          class="flex justify-between gap-4"
        ><dt class="text-gray-600">Descuento</dt><dd class="font-semibold text-red-600">- {{ formatBs(descuentoAplicadoCentavos) }}</dd></div>
        <div class="flex justify-between gap-4 border-t border-[#D4A574] pt-2">
          <dt class="font-semibold text-[#6B3A2A]">Total a pagar</dt>
          <dd class="font-bold text-[#6B3A2A]">{{ formatBs(totalNetoCentavos) }}</dd>
        </div>
      </dl>

      <div class="mt-5">
        <label :for="descuentoId" class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">Descuento (opcional)</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
          <input
            :id="descuentoId"
            :value="descuento"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
            :disabled="converting"
            class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            :aria-describedby="descuentoError ? `${descuentoId}-error` : undefined"
            :aria-invalid="descuentoError ? 'true' : undefined"
            @input="onDecimalInput('descuento', $event)"
          >
        </div>
        <p v-if="descuentoError" :id="`${descuentoId}-error`" role="alert" class="mt-2 text-sm text-red-600">{{ descuentoError }}</p>
      </div>

      <div class="mt-5">
        <label :for="montoId" class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">Monto pagado por el cliente</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
          <input
            :id="montoId"
            ref="montoInput"
            :value="montoPagado"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
            :disabled="converting"
            class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
            @input="onDecimalInput('monto', $event)"
          >
        </div>
      </div>

      <div aria-live="polite" class="mt-4 rounded-lg border px-4 py-3 text-sm font-semibold" :class="messageClass">
        {{ pagoMensaje }}
        <span v-if="montoValido" class="mt-1 block text-xs font-medium">Estado: {{ estadoPago }}</span>
      </div>

      <div v-if="error" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          :disabled="converting"
          class="min-h-11 rounded-lg border border-[#D4A574] px-4 py-2.5 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-60"
          @click="requestClose"
        >Cancelar</button>
        <button
          type="submit"
          :disabled="!canSubmit"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2.5 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span v-if="converting" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
          {{ converting ? 'Convirtiendo...' : 'Confirmar conversión' }}
        </button>
      </div>
    </form>
  </div>
</template>
