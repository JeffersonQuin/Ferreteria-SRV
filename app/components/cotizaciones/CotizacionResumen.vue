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
  <section id="resumen-cotizacion" aria-labelledby="cotizacion-resumen-title" class="scroll-mt-4 rounded-3xl border border-[#E3CFB4] bg-white p-5 shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)] lg:sticky lg:top-6">
    <h2 id="cotizacion-resumen-title" class="text-lg font-bold text-[#3A1C12]">Resumen de Cotización</h2>

    <div class="mt-4 rounded-2xl bg-[#E3F0F1] px-4 py-3">
      <p class="text-sm font-medium text-[#1B4349]">Total</p>
      <p class="text-3xl font-bold leading-tight text-[#163A40]">{{ formatBs(totalCentavos) }}</p>
    </div>

    <dl class="mt-4 space-y-3 border-b border-[#F0E2CE] pb-4 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-[#5C4033]">Nº de artículos</dt><dd class="font-semibold text-[#3A1C12]">{{ numeroArticulos }}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-[#5C4033]">Ganancia total</dt><dd class="font-semibold text-[#3A1C12]">{{ formatBs(gananciaCentavos) }}</dd></div>
    </dl>

    <div v-if="error" role="alert" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>

    <div class="mt-5 grid gap-3">
      <button
        type="button"
        class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2F7079] to-[#22555C] px-4 py-2.5 text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(34,85,92,0.7)] transition-all duration-200 enabled:hover:from-[#38808A] enabled:hover:to-[#2A6068] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22555C] focus-visible:ring-offset-2 enabled:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
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
        class="min-h-12 rounded-xl border border-[#D4A574] px-4 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] disabled:opacity-60"
        :disabled="registering"
        @click="emit('clear')"
      >
        Limpiar todo
      </button>
    </div>
  </section>
</template>
