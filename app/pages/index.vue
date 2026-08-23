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
  <div class="flex min-h-screen items-center justify-center bg-[#F5E6D3] px-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <div class="mb-4 flex justify-center">
        <svg
          class="h-14 w-14 text-[#6B3A2A]"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="20" cy="20" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <circle cx="20" cy="20" r="4" fill="currentColor" />
          <line x1="28" y1="28" x2="52" y2="52" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
          <line x1="44" y1="44" x2="50" y2="38" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
          <line x1="48" y1="48" x2="54" y2="42" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>

      <h1 class="mb-1 text-center text-2xl font-bold text-[#6B3A2A]">Ferretería SRV</h1>
      <p class="mb-8 text-center text-sm text-gray-500">
        Ingresa tus credenciales para acceder al sistema
      </p>

      <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
        <div class="relative">
          <label for="login-email" class="sr-only">Correo electrónico</label>
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              class="h-5 w-5 text-[#D4A574]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
          <input
            id="login-email"
            v-model="email"
            type="email"
            required
            placeholder="Correo electrónico"
            autocomplete="email"
            class="w-full rounded-lg border border-[#D4A574] bg-white py-3 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          >
        </div>

        <div class="relative">
          <label for="login-password" class="sr-only">Contraseña</label>
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              class="h-5 w-5 text-[#D4A574]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <input
            id="login-password"
            v-model="password"
            type="password"
            required
            placeholder="Contraseña"
            autocomplete="current-password"
            class="w-full rounded-lg border border-[#D4A574] bg-white py-3 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          >
        </div>

        <div v-if="error" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] py-3 font-semibold text-white transition-colors duration-200 hover:bg-[#8B5A3C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            v-if="loading"
            class="h-5 w-5 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>
