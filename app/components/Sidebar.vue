<script setup lang="ts">
const route = useRoute()

const links = [
  { label: 'Dashboard', to: '/dashboard', exact: true },
  { label: 'Clientes', to: '/dashboard/clientes', exact: false },
  { label: 'Productos', to: '/dashboard/productos', exact: false },
  { label: 'Ventas', to: '/dashboard/ventas', exact: false }
]

function isActive(to: string, exact: boolean) {
  return exact ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <aside class="w-full shrink-0 bg-[#6B3A2A] p-4 text-white sm:min-h-screen sm:w-56">
    <NuxtLink to="/dashboard" class="mb-4 block text-lg font-bold sm:mb-6">Ferretería SRV</NuxtLink>
    <nav aria-label="Navegación principal" class="flex flex-wrap gap-2 text-sm sm:flex-col">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors duration-200 hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
        :class="isActive(link.to, link.exact) ? 'bg-[#8B5A3C]' : ''"
        :aria-current="isActive(link.to, link.exact) ? 'page' : undefined"
      >
        <svg v-if="link.to === '/dashboard'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 11 12 3l9 8v10h-6v-6H9v6H3V11Z" />
        </svg>
        <svg v-else-if="link.to === '/dashboard/clientes'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6m3-3h-6" />
        </svg>
        <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
