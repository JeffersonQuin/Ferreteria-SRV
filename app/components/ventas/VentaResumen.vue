<script setup lang="ts">
import type { VentaEstado } from '~/composables/useVentas'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  numeroArticulos: number
  totalCentavos: number
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
  'update:montoIngresado': [value: string]
  register: []
  clear: []
}>()

const messageClass = computed(() => {
  if (!props.montoValido) return 'border-red-200 bg-red-50 text-red-700'
  if (props.estado === 'Completo') return 'border-green-200 bg-green-50 text-green-700'
  return 'border-orange-200 bg-orange-50 text-orange-700'
})
</script>

<template>
  <section aria-labelledby="resumen-title" class="rounded-xl border border-[#D4A574] bg-white p-5 shadow-sm lg:sticky lg:top-6">
    <h2 id="resumen-title" class="text-lg font-bold text-[#6B3A2A]">Resumen de Pago</h2>

    <dl class="mt-5 space-y-3 border-b border-gray-200 pb-5 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-gray-600">Nº de artículos</dt><dd class="font-semibold text-gray-800">{{ numeroArticulos }}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-gray-600">Ganancia total</dt><dd class="font-semibold text-gray-800">{{ formatBs(gananciaCentavos) }}</dd></div>
      <div class="flex justify-between gap-4 text-lg"><dt class="font-bold text-gray-800">Total</dt><dd class="font-bold text-[#6B3A2A]">{{ formatBs(totalCentavos) }}</dd></div>
    </dl>

    <div class="mt-5">
      <label for="monto-ingresado" class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">Monto pagado por el cliente</label>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
        <input
          id="monto-ingresado"
          :value="montoIngresado"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          placeholder="0.00"
          @input="emit('update:montoIngresado', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div aria-live="polite" class="mt-4 rounded-lg border px-4 py-3 text-sm font-semibold" :class="messageClass">
      {{ pagoMensaje }}
      <span v-if="montoValido" class="mt-1 block text-xs font-medium">Estado: {{ estado }}</span>
    </div>

    <div v-if="error" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</div>

    <div class="mt-5 grid gap-3">
      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
        class="min-h-11 rounded-lg border border-[#D4A574] px-4 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-60"
        :disabled="registering"
        @click="emit('clear')"
      >
        Limpiar todo
      </button>
    </div>
  </section>
</template>
