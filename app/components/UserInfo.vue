<script setup lang="ts">
const { user, signOut } = useAuth()
</script>

<template>
  <div class="flex items-center gap-4 rounded-lg border border-[#D4A574] bg-white p-4">
    <img
      :src="user?.user_metadata?.avatar_url ?? '/placeholder-avatar.png'"
      :alt="user?.user_metadata?.full_name ?? 'Usuario'"
      class="h-12 w-12 rounded-full object-cover"
    >
    <div class="flex flex-col">
      <span class="font-semibold text-[#6B3A2A]">{{ user?.user_metadata?.full_name }}</span>
      <span class="text-sm text-gray-600">{{ user?.email }}</span>
    </div>
    <button
      type="button"
      class="ml-auto rounded bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C]"
      @click="signOut"
    >
      Cerrar sesión
    </button>
  </div>
</template>
