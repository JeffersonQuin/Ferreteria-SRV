<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ferretería SRV - Dashboard' })
</script>

<template>
  <div class="flex min-h-screen bg-[#F5E6D3]">
    <Sidebar />
    <main class="flex-1 p-4 sm:p-6">
      <h1 class="mb-6 text-2xl font-bold text-[#6B3A2A]">Ferretería SRV - Dashboard</h1>
      <UserInfo />
    </main>
  </div>
</template>
