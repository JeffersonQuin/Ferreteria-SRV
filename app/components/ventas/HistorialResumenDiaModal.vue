<script setup lang="ts">
import type { ResumenDia } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  resumen: ResumenDia | null
}>()

const emit = defineEmits<{
  close: []
  consultar: [fecha: string]
}>()

// ── Estado local ──────────────────────────────────────────────────────────
function hoy() {
  return new Date().toISOString().slice(0, 10)
}

const fecha = ref(hoy())
const dateInput = ref<HTMLInputElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const titleId = useId()

// Inicializar fecha a hoy cada vez que se abre el modal
watch(
  () => props.open,
  (open) => {
    if (open) {
      fecha.value = hoy()
      nextTick(() => dateInput.value?.focus())
    }
  }
)

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
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

// ── Formatear fecha para el título del resultado ──────────────────────────
function formatFechaTitulo(fechaStr: string) {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long' }).format(
    new Date(`${fechaStr}T12:00:00`)
  )
}

function onConsultar() {
  if (!fecha.value || props.loading) return
  emit('consultar', fecha.value)
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        aria-modal="true"
        role="dialog"
        :aria-labelledby="titleId"
        @keydown="onKeydown"
        @click.self="!loading && emit('close')"
      >
        <div
          ref="panel"
          class="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
          style="max-height: min(90vh, 640px);"
        >
          <!-- Cabecera -->
          <div class="flex items-center justify-between border-b border-[#D4A574] px-6 py-4">
            <h2 :id="titleId" class="text-lg font-bold text-[#6B3A2A]">Resumen del día</h2>
            <button
              type="button"
              :disabled="loading"
              class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-[#F5E6D3] hover:text-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
              aria-label="Cerrar modal"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Selector de fecha + botón consultar -->
          <div class="flex flex-col gap-3 border-b border-[#D4A574]/50 px-6 py-4 sm:flex-row sm:items-end">
            <div class="flex-1">
              <label for="resumen-fecha" class="mb-1 block text-xs font-semibold text-gray-600">Fecha</label>
              <input
                id="resumen-fecha"
                ref="dateInput"
                v-model="fecha"
                type="date"
                :disabled="loading"
                class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
              >
            </div>
            <button
              type="button"
              :disabled="loading || !fecha"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
              @click="onConsultar"
            >
              <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              {{ loading ? 'Consultando...' : 'Consultar' }}
            </button>
          </div>

          <!-- Cuerpo scrolleable -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <!-- Cargando -->
            <div v-if="loading" class="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
              <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
              Cargando resumen...
            </div>

            <!-- Error -->
            <div v-else-if="error" role="alert" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {{ error }}
            </div>

            <!-- Sin datos aún -->
            <div v-else-if="!resumen" class="py-10 text-center text-sm text-gray-400">
              Selecciona una fecha y presiona Consultar.
            </div>

            <!-- Sin ventas ese día -->
            <div v-else-if="resumen.ventas.length === 0" class="py-10 text-center text-sm text-gray-500">
              No hay ventas registradas para el
              <span class="font-semibold text-[#6B3A2A]">{{ formatFechaTitulo(resumen.fecha) }}</span>.
            </div>

            <!-- Resultados -->
            <template v-else>
              <p class="mb-3 text-sm font-semibold text-[#8B5A3C]">
                {{ formatFechaTitulo(resumen.fecha) }}
                <span class="ml-1 text-gray-500 font-normal">({{ resumen.ventas.length }} {{ resumen.ventas.length === 1 ? 'venta' : 'ventas' }})</span>
              </p>

              <!-- Tabla de ventas del día -->
              <div class="overflow-x-auto rounded-xl border border-[#D4A574]">
                <table class="w-full border-collapse text-sm">
                  <thead class="bg-[#F5E6D3] text-left text-xs uppercase tracking-wide text-[#6B3A2A]">
                    <tr>
                      <th class="px-3 py-2">#</th>
                      <th class="px-3 py-2">Cliente</th>
                      <th class="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#D4A574]/40">
                    <tr
                      v-for="(venta, index) in resumen.ventas"
                      :key="venta.id"
                      class="hover:bg-[#F5E6D3]/30"
                    >
                      <td class="px-3 py-2 text-gray-500">{{ index + 1 }}</td>
                      <td class="px-3 py-2 font-medium text-gray-900">{{ venta.clienteNombre }}</td>
                      <td class="px-3 py-2 text-right font-semibold text-gray-900">{{ formatBs(venta.totalCentavos) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Totales del día -->
              <dl class="mt-4 space-y-1.5 rounded-xl border border-[#D4A574] bg-[#F5E6D3]/40 px-4 py-3">
                <div class="flex justify-between gap-4 text-sm">
                  <dt class="font-semibold text-gray-700">Total vendido</dt>
                  <dd class="font-bold text-gray-900">{{ formatBs(resumen.totalVentasCentavos) }}</dd>
                </div>
                <div class="flex justify-between gap-4 text-sm">
                  <dt class="font-semibold text-gray-700">Ganancia total</dt>
                  <dd
                    class="font-bold"
                    :class="resumen.totalGananciasCentavos < 0 ? 'text-amber-700' : 'text-green-700'"
                  >{{ formatBs(resumen.totalGananciasCentavos) }}</dd>
                </div>
              </dl>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
