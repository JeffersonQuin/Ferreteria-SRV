<script setup lang="ts">
import type { HistorialCotizacionDetalle } from '~/composables/useHistorialCotizaciones'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  open: boolean
  detalle: HistorialCotizacionDetalle | null
  loading: boolean
  error: string | null
  warning: string | null
}>()

const emit = defineEmits<{
  close: []
  retry: []
}>()

const titleId = useId()
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

function requestClose() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = Array.from(panel.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
  if (!focusable.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && (active === last || !panel.value?.contains(active))) {
    event.preventDefault()
    first?.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      closeButton.value?.focus()
      return
    }
    await nextTick()
    if (previouslyFocused && !previouslyFocused.hasAttribute('disabled')) previouslyFocused.focus()
    previouslyFocused = null
  }
)
</script>

<template>
  <div
    v-if="open"
    class="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="requestClose"
    @keydown="onKeydown"
  >
    <div
      ref="panel"
      tabindex="-1"
      class="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Cotización histórica</p>
          <h2 :id="titleId" class="mt-1 text-xl font-bold text-[#6B3A2A]">
            {{ detalle ? `Detalle de cotización N.º ${detalle.cotizacion.id}` : 'Detalle de cotización' }}
          </h2>
        </div>
        <button
          ref="closeButton"
          type="button"
          class="min-h-11 min-w-11 rounded-lg p-2 text-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          aria-label="Cerrar detalle de cotización"
          @click="requestClose"
        >×</button>
      </div>

      <div
        v-if="loading"
        role="status"
        class="mt-6 flex items-center gap-3 rounded-xl bg-[#F5E6D3] p-4 text-sm text-[#6B3A2A]"
      >
        <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
        Cargando detalle de la cotización...
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p>{{ error }}</p>
        <button
          type="button"
          class="mt-3 min-h-11 rounded-lg bg-[#6B3A2A] px-4 py-2 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
          @click="emit('retry')"
        >Reintentar</button>
      </div>

      <template v-else-if="detalle">
        <dl class="mt-5 grid gap-3 rounded-xl border border-[#D4A574] bg-[#F5E6D3]/60 p-4 text-sm sm:grid-cols-2">
          <div><dt class="text-gray-500">Cliente</dt><dd class="font-semibold text-gray-900">{{ detalle.cotizacion.clienteNombre }}</dd></div>
          <div><dt class="text-gray-500">Celular</dt><dd class="font-semibold text-gray-900">{{ detalle.cotizacion.clienteCelular || 'No registrado' }}</dd></div>
          <div><dt class="text-gray-500">Fecha</dt><dd class="font-semibold text-gray-900">{{ formatDate(detalle.cotizacion.fecha) }}</dd></div>
          <div><dt class="text-gray-500">Total</dt><dd class="font-semibold text-gray-900">{{ formatBs(detalle.cotizacion.totalCentavos) }}</dd></div>
          <div><dt class="text-gray-500">Ganancia</dt><dd class="font-semibold text-green-700">{{ formatBs(detalle.cotizacion.gananciaTotalCentavos) }}</dd></div>
        </dl>

        <p
          v-if="warning"
          role="alert"
          class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >{{ warning }}</p>

        <div class="mt-5 overflow-x-auto rounded-xl border border-[#D4A574]">
          <table class="min-w-full border-collapse text-sm">
            <thead class="bg-[#F5E6D3] text-left text-xs uppercase tracking-wide text-[#6B3A2A]">
              <tr>
                <th class="px-4 py-3">Producto</th>
                <th class="px-4 py-3 text-center">Cantidad</th>
                <th class="px-4 py-3 text-right">P. Venta</th>
                <th class="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D4A574]/50">
              <tr v-for="item in detalle.items" :key="item.id">
                <td class="px-4 py-3 font-medium text-gray-900">{{ item.nombreProducto }}</td>
                <td class="px-4 py-3 text-center text-gray-700">{{ item.cantidad }}</td>
                <td class="px-4 py-3 text-right text-gray-700">{{ formatBs(item.precioVentaUnitarioCentavos) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ formatBs(item.subtotalCentavos) }}</td>
              </tr>
              <tr v-if="!detalle.items.length">
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">No se encontraron ítems de la cotización.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="min-h-11 rounded-lg border border-[#D4A574] px-5 py-2.5 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
            @click="requestClose"
          >Cerrar</button>
        </div>
      </template>
    </div>
  </div>
</template>
