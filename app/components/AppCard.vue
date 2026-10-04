<script setup lang="ts">
defineProps<{
  to: string
  label: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-[#D4A574] bg-white p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 active:scale-95"
  >
    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-[#6B3A2A] text-white transition-colors duration-200 group-hover:bg-[#8B5A3C]">
      <slot name="icon" />
    </span>
    <span class="text-sm font-semibold leading-tight text-[#6B3A2A] sm:text-base">{{ label }}</span>
  </NuxtLink>
</template>
