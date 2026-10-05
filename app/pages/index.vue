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
  <div class="flex min-h-dvh flex-col bg-[#4A2418] lg:flex-row">
    <!-- Marca: panel oscuro con tablero perforado -->
    <section
      class="relative isolate flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#3A1C12] via-[#4A2418] to-[#6B3A2A] px-6 pb-20 pt-12 text-center text-white lg:w-1/2 lg:pb-12"
    >
      <div class="pegboard pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <img
        src="/Logo.png"
        alt="Ferretería SRV"
        width="160"
        height="160"
        fetchpriority="high"
        class="h-28 w-28 rounded-[1.75rem] object-contain shadow-[0_18px_32px_-10px_rgba(0,0,0,0.6)] ring-2 ring-[#D4A574]/70 sm:h-32 sm:w-32 lg:h-40 lg:w-40 lg:rounded-[2.25rem]"
      >
      <h1 class="mt-6 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Ferretería SRV</h1>
      <span class="mt-4 h-1 w-12 rounded-full bg-[#D4A574]" aria-hidden="true" />
      <p class="mt-4 text-sm text-[#E8D4BC] sm:text-base">Sistema de gestión</p>
    </section>

    <!-- Formulario: hoja que sube sobre el panel en móvil -->
    <main
      class="relative -mt-8 flex flex-1 flex-col rounded-t-[2rem] bg-[#FBF3E8] px-5 pb-10 pt-8 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.45)] sm:px-8 lg:mt-0 lg:items-center lg:justify-center lg:rounded-none lg:px-12 lg:shadow-none"
    >
      <div class="mx-auto w-full max-w-sm">
        <h2 class="text-2xl font-bold text-[#4A2418]">Iniciar sesión</h2>
        <p class="mb-7 mt-1.5 text-sm text-[#5C4033]">
          Ingresa tus credenciales para acceder al sistema
        </p>

        <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
          <div>
            <label for="login-email" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
              Correo electrónico
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <svg
                  class="h-5 w-5 text-[#A9784A]"
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
                placeholder="nombre@correo.com"
                autocomplete="email"
                inputmode="email"
                autocapitalize="none"
                spellcheck="false"
                enterkeyhint="next"
                class="min-h-13 w-full rounded-xl border border-[#A9784A] bg-white py-3.5 pl-11 pr-4 text-base text-gray-900 caret-[#6B3A2A] shadow-sm placeholder-gray-500 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] sm:text-sm"
              >
            </div>
          </div>

          <div>
            <label for="login-password" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">
              Contraseña
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <svg
                  class="h-5 w-5 text-[#A9784A]"
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
                placeholder="Tu contraseña"
                autocomplete="current-password"
                autocapitalize="none"
                spellcheck="false"
                enterkeyhint="go"
                class="min-h-13 w-full rounded-xl border border-[#A9784A] bg-white py-3.5 pl-11 pr-14 text-base text-gray-900 caret-[#6B3A2A] shadow-sm placeholder-gray-500 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] sm:text-sm"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex w-13 items-center justify-center rounded-r-xl text-[#6B3A2A] transition-colors duration-200 hover:text-[#3A1C12] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6B3A2A]"
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
          </div>

          <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            :aria-busy="loading"
            class="mt-1 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#6B3A2A] to-[#4A2418] text-base font-semibold text-white shadow-[0_10px_20px_-8px_rgba(74,36,24,0.7)] transition-all duration-200 enabled:hover:from-[#7A4634] enabled:hover:to-[#5A2F21] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF3E8] enabled:active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60"
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
    </main>
  </div>
</template>
