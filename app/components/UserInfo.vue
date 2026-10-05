<script setup lang="ts">
const { user, signOut } = useAuth()

const nombre = computed(() => {
  const completo = user.value?.user_metadata?.full_name as string | undefined
  if (completo?.trim()) return completo.trim()
  return user.value?.email?.split('@')[0] ?? 'Usuario'
})
</script>

<template>
  <!-- Pensado para ir sobre la cabecera oscura del dashboard -->
  <div class="flex items-center gap-3">
    <img
      :src="user?.user_metadata?.avatar_url ?? '/placeholder-avatar.png'"
      :alt="nombre"
      width="48"
      height="48"
      class="h-12 w-12 shrink-0 rounded-full bg-[#F5E6D3] object-cover ring-2 ring-[#D4A574]"
    >
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="truncate font-semibold text-white">{{ nombre }}</span>
      <span class="truncate text-sm text-[#E8D4BC]">{{ user?.email }}</span>
    </div>
    <button
      type="button"
      class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#D4A574]/70 px-3.5 text-sm font-semibold text-[#F5E6D3] transition-colors duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] motion-reduce:transition-none"
      @click="signOut"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      <span>Salir</span>
    </button>
  </div>
</template>
