<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const email = ref('')
const password = ref('')

const { signInWithEmail, loading, error } = useAuth()

async function handleSubmit() {
  await signInWithEmail(email.value, password.value)
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#F5E6D3] px-4">
    <div class="w-full max-w-sm">
      <h1 class="mb-8 text-center text-2xl font-bold text-[#6B3A2A]">Ferretería SRV</h1>

      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <input
          v-model="email"
          type="email"
          required
          placeholder="Correo electrónico"
          class="rounded border border-[#D4A574] bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none"
        >
        <input
          v-model="password"
          type="password"
          required
          placeholder="Contraseña"
          class="rounded border border-[#D4A574] bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none"
        >

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="rounded bg-[#6B3A2A] py-2 font-semibold text-white transition-colors hover:bg-[#8B5A3C] disabled:opacity-60"
        >
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>
