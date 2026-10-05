<script setup lang="ts">
const { user, signOut } = useAuth()
</script>

<template>
  <div class="flex flex-col gap-3 rounded-2xl border border-[#D4A574] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
    <div class="flex min-w-0 items-center gap-3">
      <img
        :src="user?.user_metadata?.avatar_url ?? '/placeholder-avatar.png'"
        :alt="user?.user_metadata?.full_name ?? 'Usuario'"
        width="48"
        height="48"
        class="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#D4A574]"
      >
      <div class="flex min-w-0 flex-col">
        <span class="truncate font-semibold text-[#6B3A2A]">{{ user?.user_metadata?.full_name }}</span>
        <span class="truncate text-sm text-gray-600">{{ user?.email }}</span>
      </div>
    </div>
    <button
      type="button"
      class="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 sm:ml-auto"
      @click="signOut"
    >
      Cerrar sesión
    </button>
  </div>
</template>
