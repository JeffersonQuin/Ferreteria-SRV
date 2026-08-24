<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#F5E6D3] sm:flex-row">
    <Sidebar />
    <main id="main-content" class="min-w-0 flex-1 p-4 sm:p-6">
      <NuxtPage />
    </main>
  </div>
</template>
