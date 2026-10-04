<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div class="min-h-screen bg-[#F5E6D3]">
    <main id="main-content" class="mx-auto w-full max-w-7xl min-w-0 p-4 sm:p-6">
      <NuxtPage />
    </main>
  </div>
</template>
