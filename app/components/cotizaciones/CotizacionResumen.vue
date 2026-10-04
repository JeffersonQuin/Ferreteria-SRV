<script setup lang="ts">
import { formatBs } from '~/utils/money'

defineProps<{
  numeroArticulos: number
  totalCentavos: number
  gananciaCentavos: number
  canRegister: boolean
  registering: boolean
  error: string | null
}>()

const emit = defineEmits<{
  register: []
  clear: []
}>()
</script>

<template>
  <section aria-labelledby="cotizacion-resumen-title" class="rounded-xl border border-[#D4A574] bg-white p-5 shadow-sm lg:sticky lg:top-6">
    <h2 id="cotizacion-resumen-title" class="text-lg font-bold text-[#6B3A2A]">Resumen de Cotización</h2>

    <dl class="mt-5 space-y-3 border-b border-gray-200 pb-5 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-gray-600">Nº de artículos</dt><dd class="font-semibold text-gray-800">{{ numeroArticulos }}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-gray-600">Ganancia total</dt><dd class="font-semibold text-gray-800">{{ formatBs(gananciaCentavos) }}</dd></div>
      <div class="flex justify-between gap-4 text-lg"><dt class="font-bold text-gray-800">Total</dt><dd class="font-bold text-[#6B3A2A]">{{ formatBs(totalCentavos) }}</dd></div>
    </dl>

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
        {{ registering ? 'Registrando...' : 'Registrar cotización' }}
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
