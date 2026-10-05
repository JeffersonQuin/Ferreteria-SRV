<script setup lang="ts">
type Tono = 'arena' | 'terracota' | 'ocre' | 'oliva' | 'petroleo' | 'ciruela' | 'pizarra'

const props = withDefaults(
  defineProps<{
    to: string
    label: string
    hint?: string
    tono?: Tono
    destacada?: boolean
  }>(),
  { hint: undefined, tono: 'terracota', destacada: false }
)

// Clases completas y estáticas para que Tailwind las detecte.
const iconoPorTono: Record<Tono, string> = {
  arena: 'bg-gradient-to-br from-[#6B3A2A] to-[#3A1C12]',
  terracota: 'bg-gradient-to-br from-[#C2603F] to-[#9A4330]',
  ocre: 'bg-gradient-to-br from-[#B07A1E] to-[#8A5E12]',
  oliva: 'bg-gradient-to-br from-[#6B7A3A] to-[#505E26]',
  petroleo: 'bg-gradient-to-br from-[#2F7079] to-[#22555C]',
  ciruela: 'bg-gradient-to-br from-[#86446A] to-[#653050]',
  pizarra: 'bg-gradient-to-br from-[#56636F] to-[#3E4852]'
}

const iconoClase = computed(() => iconoPorTono[props.tono])
</script>

<template>
  <!-- Tarjeta destacada: acción principal, ancho completo -->
  <NuxtLink
    v-if="destacada"
    :to="to"
    class="group relative flex min-h-28 items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0B98A] to-[#C98F58] p-5 text-[#3A1C12] shadow-[0_14px_28px_-12px_rgba(107,58,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-12px_rgba(107,58,42,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5E6D3] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:p-6"
  >
    <span
      class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.55)] sm:h-[4.5rem] sm:w-[4.5rem]"
      :class="iconoClase"
    >
      <slot name="icon" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-xl font-bold leading-tight sm:text-2xl">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-sm font-medium text-[#4A2418]">{{ hint }}</span>
    </span>
    <svg class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  </NuxtLink>

  <!-- Tarjeta estándar -->
  <NuxtLink
    v-else
    :to="to"
    class="group flex min-h-36 flex-col items-center justify-center gap-3 rounded-3xl border border-[#E3CFB4] bg-white p-4 text-center shadow-[0_1px_2px_rgba(74,36,24,0.08),0_10px_20px_-12px_rgba(74,36,24,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4A574] hover:shadow-[0_1px_2px_rgba(74,36,24,0.08),0_16px_26px_-12px_rgba(74,36,24,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6B3A2A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5E6D3] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
  >
    <span
      class="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[0_8px_14px_-6px_rgba(0,0,0,0.45)]"
      :class="iconoClase"
    >
      <slot name="icon" />
    </span>
    <span class="text-balance text-[0.95rem] font-semibold leading-tight text-[#3A1C12] sm:text-base">{{ label }}</span>
  </NuxtLink>
</template>
