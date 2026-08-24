<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ferretería SRV - Dashboard' })
</script>

<template>
  <section aria-labelledby="dashboard-title">
    <h1 id="dashboard-title" class="mb-6 text-2xl font-bold text-[#6B3A2A]">Ferretería SRV - Dashboard</h1>
    <UserInfo />
  </section>
</template>
