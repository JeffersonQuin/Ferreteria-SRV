<script setup lang="ts">
defineProps<{
  to: string
  label: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-[#D4A574]/70 bg-gradient-to-b from-white to-[#FBF3E8] p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 active:scale-95 sm:p-5"
  >
    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6B3A2A] to-[#8B5A3C] text-white shadow-md transition-transform duration-200 group-hover:scale-105">
      <slot name="icon" />
    </span>
    <span class="text-sm font-semibold leading-tight text-[#6B3A2A] sm:text-base">{{ label }}</span>
  </NuxtLink>
</template>
