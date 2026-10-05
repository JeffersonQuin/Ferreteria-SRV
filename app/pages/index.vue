<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const { signInWithEmail, loading, error } = useAuth()

async function handleSubmit() {
  await signInWithEmail(email.value, password.value)
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F5E6D3] via-[#F0DCC4] to-[#E8D4BC] px-4 py-8">
    <div class="w-full max-w-md">
      <div class="mb-6 flex flex-col items-center text-center">
        <img
          src="/Logo.png"
          alt="Ferretería SRV"
          width="112"
          height="112"
          class="h-24 w-24 rounded-3xl object-contain shadow-lg ring-2 ring-[#D4A574]/60 sm:h-28 sm:w-28"
        >
        <h1 class="mt-4 text-3xl font-bold text-[#4A2418]">Ferretería SRV</h1>
        <p class="mt-1 text-sm font-medium text-[#8B5A3C]">Soluciones rápidas y variadas</p>
      </div>

      <div class="rounded-2xl border-t-4 border-[#D4A574] bg-white p-6 shadow-xl sm:p-8">
        <h2 class="text-lg font-bold text-[#6B3A2A]">Iniciar sesión</h2>
        <p class="mb-6 mt-1 text-sm text-gray-500">
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
              class="w-full rounded-xl border border-[#D4A574] bg-white py-3.5 pl-10 pr-4 text-base text-gray-800 placeholder-gray-400 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] sm:text-sm"
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
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Contraseña"
              autocomplete="current-password"
              class="w-full rounded-xl border border-[#D4A574] bg-white py-3.5 pl-10 pr-12 text-base text-gray-800 placeholder-gray-400 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] sm:text-sm"
            >
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#8B5A3C] transition-colors duration-200 hover:text-[#6B3A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="!showPassword"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                v-else
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3 3.9M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
                <path d="M9.4 9.4a3 3 0 0 0 4.2 4.2M2 2l20 20" />
              </svg>
            </button>
          </div>

          <div v-if="error" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6B3A2A] to-[#8B5A3C] py-3 font-semibold text-white shadow-md transition-all duration-200 hover:from-[#5A2F21] hover:to-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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

      <p class="mt-6 text-center text-xs text-[#8B5A3C]">Sistema de gestión · Ferretería SRV</p>
    </div>
  </div>
</template>
