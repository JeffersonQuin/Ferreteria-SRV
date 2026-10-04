<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ferretería SRV - Dashboard' })
</script>

<template>
  <section aria-labelledby="dashboard-title" class="mx-auto flex max-w-5xl flex-col gap-6">
    <header>
      <h1 id="dashboard-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Ferretería SRV</h1>
      <p class="mt-1 text-sm text-gray-600">Elige una aplicación para empezar</p>
    </header>

    <UserInfo />

    <nav aria-label="Aplicaciones" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <AppCard to="/dashboard/clientes" label="Clientes">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6m3-3h-6" />
          </svg>
        </template>
      </AppCard>

      <AppCard to="/dashboard/productos" label="Productos">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
          </svg>
        </template>
      </AppCard>

      <AppCard to="/dashboard/ventas" label="Ventas">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          </svg>
        </template>
      </AppCard>

      <AppCard to="/dashboard/historial" label="Historial">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5M12 7v5l3 2" />
          </svg>
        </template>
      </AppCard>

      <AppCard to="/dashboard/cotizaciones" label="Cotizaciones">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
            <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
          </svg>
        </template>
      </AppCard>

      <AppCard to="/dashboard/historial-cotizaciones" label="Historial Cotizaciones">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5" />
            <path d="M14 2v6h6M8 9h2M8 13h3" />
            <circle cx="17" cy="17" r="5" />
            <path d="M17 14.5V17l1.5 1" />
          </svg>
        </template>
      </AppCard>

      <AppCard to="/dashboard/configuracion" label="Configuración">
        <template #icon>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </template>
      </AppCard>
    </nav>
  </section>
</template>
