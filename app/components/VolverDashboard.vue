<script setup lang="ts">
import { iconoPorTono, type Tono } from '~/utils/tonos'

// Sin `titulo`: barra simple con el botón "Volver" (p. ej. Ventas).
// Con `titulo`: cabecera de marca con el ícono y color del módulo.
withDefaults(
  defineProps<{
    titulo?: string
    descripcion?: string
    tono?: Tono
    tituloId?: string
  }>(),
  { titulo: undefined, descripcion: undefined, tono: 'arena', tituloId: undefined }
)
</script>

<template>
  <header
    v-if="titulo"
    class="no-print relative isolate mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3A1C12] via-[#4A2418] to-[#6B3A2A] p-4 text-white shadow-[0_16px_28px_-16px_rgba(58,28,18,0.85)] sm:mb-6 sm:p-6"
  >
    <div class="pegboard pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <NuxtLink
      to="/dashboard"
      class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D4A574]/60 pl-3 pr-4 text-sm font-semibold text-[#F5E6D3] transition-colors duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] motion-reduce:transition-none"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Volver
    </NuxtLink>

    <div class="mt-4 flex items-center gap-4">
      <span
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_18px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:h-16 sm:w-16"
        :class="iconoPorTono[tono]"
      >
        <slot name="icon" />
      </span>
      <div class="min-w-0">
        <h1 :id="tituloId" class="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{{ titulo }}</h1>
        <p v-if="descripcion" class="mt-1 text-sm leading-snug text-[#E8D4BC]">{{ descripcion }}</p>
      </div>
    </div>
  </header>

  <div v-else class="no-print mb-4 flex items-center gap-3">
    <NuxtLink
      to="/dashboard"
      class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Volver
    </NuxtLink>
  </div>
</template>
