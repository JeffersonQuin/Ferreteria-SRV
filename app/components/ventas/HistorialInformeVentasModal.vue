<script setup lang="ts">
import type { RangoFechas } from '~/composables/useResumenPorDia'

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  aceptar: [rango: RangoFechas]
}>()

// ── Estado local ──────────────────────────────────────────────────────────
function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toIsoLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Por defecto: primer y último día del mes actual (hora local)
function rangoMesActual(): RangoFechas {
  const now = new Date()
  return {
    desde: toIsoLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
    hasta: toIsoLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  }
}

const desde = ref('')
const hasta = ref('')
const desdeInput = ref<HTMLInputElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const errorRangoId = useId()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const rango = rangoMesActual()
    desde.value = rango.desde
    hasta.value = rango.hasta
    nextTick(() => desdeInput.value?.focus())
  },
  { immediate: true }
)

const errorRango = computed(() => {
  if (desde.value && hasta.value && desde.value > hasta.value) {
    return 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".'
  }
  return null
})

const puedeAceptar = computed(() => !props.loading && !!desde.value && !!hasta.value && !errorRango.value)

// ── Accesibilidad: foco atrapado dentro del modal ─────────────────────────
const focusableSelector = [
  'input:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !props.loading) {
    emit('close')
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  const focusables = Array.from(panel.value.querySelectorAll<HTMLElement>(focusableSelector))
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else if (document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function onAceptar() {
  if (!puedeAceptar.value) return
  emit('aceptar', { desde: desde.value, hasta: hasta.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        aria-modal="true"
        role="dialog"
        :aria-labelledby="titleId"
        @keydown="onKeydown"
        @click.self="!loading && emit('close')"
      >
        <form
          ref="panel"
          class="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
          novalidate
          @submit.prevent="onAceptar"
        >
          <!-- Cabecera -->
          <div class="flex items-center justify-between border-b border-[#D4A574] px-6 py-4">
            <h2 :id="titleId" class="text-lg font-bold text-[#6B3A2A]">Informe de ventas</h2>
            <button
              type="button"
              :disabled="loading"
              class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-[#F5E6D3] hover:text-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
              aria-label="Cerrar modal"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Rango de fechas -->
          <div class="px-6 py-5">
            <p class="mb-4 text-sm text-[#5C4033]">
              Elige el rango de fechas. El informe incluirá solo las ventas de ese período.
            </p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label for="informe-fecha-desde" class="mb-1 block text-xs font-semibold text-gray-600">Desde</label>
                <input
                  id="informe-fecha-desde"
                  ref="desdeInput"
                  v-model="desde"
                  type="date"
                  required
                  :max="hasta || undefined"
                  :disabled="loading"
                  :aria-invalid="errorRango ? 'true' : 'false'"
                  :aria-describedby="errorRango ? errorRangoId : undefined"
                  class="min-h-12 w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                  :class="{ 'border-red-400': errorRango }"
                >
              </div>
              <div>
                <label for="informe-fecha-hasta" class="mb-1 block text-xs font-semibold text-gray-600">Hasta</label>
                <input
                  id="informe-fecha-hasta"
                  v-model="hasta"
                  type="date"
                  required
                  :min="desde || undefined"
                  :disabled="loading"
                  :aria-invalid="errorRango ? 'true' : 'false'"
                  :aria-describedby="errorRango ? errorRangoId : undefined"
                  class="min-h-12 w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
                  :class="{ 'border-red-400': errorRango }"
                >
              </div>
            </div>

            <p v-if="errorRango" :id="errorRangoId" role="alert" class="mt-3 text-sm font-medium text-red-700">
              {{ errorRango }}
            </p>
            <p v-else-if="error" role="alert" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {{ error }}
            </p>
          </div>

          <!-- Acciones -->
          <div class="flex flex-col-reverse gap-2 border-t border-[#D4A574]/50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              :disabled="loading"
              class="min-h-11 rounded-lg border border-[#D4A574] px-5 py-2.5 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!puedeAceptar"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              {{ loading ? 'Generando...' : 'Aceptar' }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
