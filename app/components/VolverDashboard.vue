<script setup lang="ts">
defineProps<{
  titulo?: string
}>()
</script>

<template>
  <div class="no-print mb-4 flex items-center gap-3">
    <NuxtLink
      to="/dashboard"
      class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Volver
    </NuxtLink>
    <span v-if="titulo" class="text-lg font-bold text-[#6B3A2A]">{{ titulo }}</span>
  </div>
</template>
