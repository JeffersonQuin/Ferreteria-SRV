<script setup lang="ts">
import type { VentaEstado } from '~/composables/useVentas'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  numeroArticulos: number
  totalCentavos: number
  descuento: string
  totalConDescuentoCentavos: number
  gananciaCentavos: number
  montoIngresado: string
  montoValido: boolean
  estado: VentaEstado
  pagoMensaje: string
  canRegister: boolean
  registering: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:descuento': [value: string]
  'update:montoIngresado': [value: string]
  register: []
  clear: []
}>()

const messageClass = computed(() => {
  if (!props.montoValido) return 'border-red-200 bg-red-50 text-red-700'
  if (props.estado === 'Completo') return 'border-green-200 bg-green-50 text-green-800'
  return 'border-orange-200 bg-orange-50 text-orange-800'
})

const tieneDescuento = computed(() => {
  const valor = Number(props.descuento)
  return !Number.isNaN(valor) && valor > 0
})
</script>

<template>
  <section id="resumen-pago" aria-labelledby="resumen-title" class="scroll-mt-4 rounded-3xl border border-[#E3CFB4] bg-white p-5 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)] lg:sticky lg:top-6">
    <h2 id="resumen-title" class="flex items-center gap-2 text-lg font-bold text-[#3A1C12]">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6D3] text-[#6B3A2A]" aria-hidden="true">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>
      </span>
      Resumen de Pago
    </h2>

    <!-- Total a pagar: el dato principal -->
    <div class="mt-4 rounded-2xl bg-[#FBE6BE] px-4 py-3">
      <p class="text-sm font-medium text-[#4A2418]">{{ tieneDescuento ? 'Total a pagar' : 'Total' }}</p>
      <p class="text-3xl font-bold leading-tight text-[#3A1C12]">
        {{ formatBs(tieneDescuento ? totalConDescuentoCentavos : totalCentavos) }}
      </p>
    </div>

    <dl class="mt-4 space-y-3 border-b border-[#F0E2CE] pb-4 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-[#5C4033]">Nº de artículos</dt><dd class="font-semibold text-[#3A1C12]">{{ numeroArticulos }}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-[#5C4033]">Ganancia total</dt><dd class="font-semibold text-[#3A1C12]">{{ formatBs(gananciaCentavos) }}</dd></div>
      <template v-if="tieneDescuento">
        <div class="flex justify-between gap-4"><dt class="text-[#5C4033]">Subtotal</dt><dd class="font-semibold text-[#5C4033] line-through">{{ formatBs(totalCentavos) }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-[#5C4033]">Descuento</dt><dd class="font-semibold text-red-700">- {{ descuento }} Bs</dd></div>
      </template>
    </dl>

    <div class="mt-4">
      <label for="descuento" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Descuento <span class="font-normal text-[#5C4033]">(opcional)</span></label>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[#8B5A3C]">Bs</span>
        <input
          id="descuento"
          :value="descuento"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          class="min-h-[3.25rem] w-full rounded-xl border border-[#A9784A] bg-white pl-11 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          placeholder="0.00"
          @input="emit('update:descuento', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div class="mt-4">
      <label for="monto-ingresado" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Monto pagado por el cliente</label>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[#8B5A3C]">Bs</span>
        <input
          id="monto-ingresado"
          :value="montoIngresado"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          class="min-h-[3.25rem] w-full rounded-xl border border-[#A9784A] bg-white pl-11 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          placeholder="0.00"
          @input="emit('update:montoIngresado', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div aria-live="polite" class="mt-4 rounded-xl border px-4 py-3 text-sm font-semibold" :class="messageClass">
      {{ pagoMensaje }}
      <span v-if="montoValido" class="mt-1 block text-xs font-medium">Estado: {{ estado }}</span>
    </div>

    <div v-if="error" role="alert" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>

    <div class="mt-5 grid gap-3">
      <button
        type="button"
        class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#6B3A2A] to-[#4A2418] px-4 py-2.5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(74,36,24,0.7)] transition-all duration-200 enabled:hover:from-[#7A4634] enabled:hover:to-[#5A2F21] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 enabled:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        :disabled="!canRegister"
        @click="emit('register')"
      >
        <svg v-if="registering" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
        </svg>
        {{ registering ? 'Registrando...' : 'Registrar venta' }}
      </button>
      <button
        type="button"
        class="min-h-12 rounded-xl border border-[#D4A574] px-4 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-60"
        :disabled="registering"
        @click="emit('clear')"
      >
        Limpiar todo
      </button>
    </div>
  </section>
</template>
