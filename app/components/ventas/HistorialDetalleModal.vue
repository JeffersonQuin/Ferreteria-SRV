<script setup lang="ts">
import type { HistorialVentaDetalle, HistorialVentaItem } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

const props = defineProps<{
  open: boolean
  detalle: HistorialVentaDetalle | null
  loading: boolean
  error: string | null
  warning: string | null
  editing?: boolean
  editError?: string | null
}>()

const emit = defineEmits<{
  close: []
  retry: []
  guardarEdicion: [itemsAEliminar: number[]]
}>()

// ── Estado local de edición ────────────────────────────────────────────────
const modoEdicion = ref(false)
// Conjunto de ids reales de venta_items (HistorialVentaItem.id) a eliminar
const itemsEliminadosIds = ref<Set<number>>(new Set())

const itemsVisibles = computed<HistorialVentaItem[]>(() => {
  if (!props.detalle) return []
  return props.detalle.items.filter(item => !itemsEliminadosIds.value.has(item.id))
})

const totalEditadoCentavos = computed(() => {
  const bruto = itemsVisibles.value.reduce((sum, item) => sum + item.subtotalCentavos, 0)
  const descuento = props.detalle?.venta.descuentoCentavos ?? 0
  return Math.max(bruto - descuento, 0)
})

const hayItemsEliminados = computed(() => itemsEliminadosIds.value.size > 0)

function eliminarItem(itemId: number) {
  // No se puede eliminar si quedaría 0 ítems
  if (itemsVisibles.value.length <= 1) return
  const next = new Set(itemsEliminadosIds.value)
  next.add(itemId)
  itemsEliminadosIds.value = next
}

function entrarModoEdicion() {
  itemsEliminadosIds.value = new Set()
  modoEdicion.value = true
}

function cancelarEdicion() {
  itemsEliminadosIds.value = new Set()
  modoEdicion.value = false
}

function guardarEdicion() {
  if (!props.detalle || !hayItemsEliminados.value || props.editing) return
  emit('guardarEdicion', [...itemsEliminadosIds.value])
}

// Cuando editing pasa de true → false sin error, salir del modo edición
watch(
  () => props.editing,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false && !props.editError) {
      modoEdicion.value = false
      itemsEliminadosIds.value = new Set()
    }
  }
)

// Resetear al cerrar el modal
watch(
  () => props.open,
  (open) => {
    if (!open) {
      modoEdicion.value = false
      itemsEliminadosIds.value = new Set()
    }
  }
)
// ──────────────────────────────────────────────────────────────────────────

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

function badgeClass(estado: string) {
  if (estado === 'Completo') return 'bg-green-100 text-green-800'
  if (estado === 'Pendiente') return 'bg-amber-100 text-amber-900'
  return 'bg-red-100 text-red-800'
}

function requestClose() {
  if (props.editing) return
  if (modoEdicion.value) {
    // Escape en modo edición → cancelar edición (no cierra el modal)
    cancelarEdicion()
    return
  }
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
      <!-- Cabecera -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">
            {{ modoEdicion ? 'Editando venta' : 'Venta histórica' }}
          </p>
          <h2 :id="titleId" class="mt-1 text-xl font-bold text-[#6B3A2A]">
            {{ detalle ? `Detalle de venta N.º ${detalle.venta.id}` : 'Detalle de venta' }}
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <!-- Botón Editar: visible solo en modo visualización con datos -->
          <button
            v-if="detalle && !modoEdicion && !loading && !error"
            type="button"
            :disabled="editing"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#D4A574] px-3 py-2 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
            title="Editar venta"
            @click="entrarModoEdicion"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
            </svg>
            Editar
          </button>
          <!-- Botón cerrar / cancelar modo edición -->
          <button
            ref="closeButton"
            type="button"
            :disabled="editing"
            class="min-h-11 min-w-11 rounded-lg p-2 text-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-50"
            aria-label="Cerrar detalle de venta"
            @click="requestClose"
          >×</button>
        </div>
      </div>

      <!-- Cargando -->
      <div
        v-if="loading"
        role="status"
        class="mt-6 flex items-center gap-3 rounded-xl bg-[#F5E6D3] p-4 text-sm text-[#6B3A2A]"
      >
        <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A574] border-t-[#6B3A2A]" aria-hidden="true" />
        Cargando detalle de la venta...
      </div>

      <!-- Error de carga -->
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

      <!-- Contenido -->
      <template v-else-if="detalle">

        <!-- Banner aviso modo edición -->
        <div
          v-if="modoEdicion"
          class="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <svg class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <span>
            Presiona <strong>✕</strong> en cada producto para quitarlo de la venta.
            Los totales se recalculan en tiempo real.
          </span>
        </div>

        <!-- Resumen cabecera -->
        <dl class="mt-5 grid gap-3 rounded-xl border border-[#D4A574] bg-[#F5E6D3]/60 p-4 text-sm sm:grid-cols-2">
          <div><dt class="text-gray-500">Cliente</dt><dd class="font-semibold text-gray-900">{{ detalle.venta.clienteNombre }}</dd></div>
          <div><dt class="text-gray-500">Celular</dt><dd class="font-semibold text-gray-900">{{ detalle.venta.clienteCelular || 'No registrado' }}</dd></div>
          <div><dt class="text-gray-500">Fecha</dt><dd class="font-semibold text-gray-900">{{ formatDate(detalle.venta.fecha) }}</dd></div>
          <div>
            <dt class="text-gray-500">Estado</dt>
            <dd>
              <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" :class="badgeClass(detalle.venta.estado)">
                {{ detalle.venta.estado }}
              </span>
            </dd>
          </div>
          <div v-if="detalle.venta.descuentoCentavos > 0">
            <dt class="text-gray-500">Descuento</dt>
            <dd class="font-semibold text-red-600">{{ formatBs(detalle.venta.descuentoCentavos) }}</dd>
          </div>
          <!-- Total: reactivo en modo edición -->
          <div>
            <dt class="text-gray-500">Total</dt>
            <dd class="font-semibold text-gray-900">
              <template v-if="modoEdicion && hayItemsEliminados">
                <span class="mr-1 text-xs line-through text-gray-400">{{ formatBs(detalle.venta.totalCentavos) }}</span>
                <span class="text-[#6B3A2A]">{{ formatBs(totalEditadoCentavos) }}</span>
              </template>
              <template v-else>{{ formatBs(detalle.venta.totalCentavos) }}</template>
            </dd>
          </div>
          <div><dt class="text-gray-500">Pagado</dt><dd class="font-semibold text-gray-900">{{ formatBs(detalle.venta.pagadoCentavos) }}</dd></div>
          <div>
            <dt class="text-gray-500">Saldo pendiente</dt>
            <dd class="font-semibold text-gray-900">
              <template v-if="modoEdicion && hayItemsEliminados">
                {{ formatBs(Math.max(totalEditadoCentavos - detalle.venta.pagadoCentavos, 0)) }}
              </template>
              <template v-else>
                {{ formatBs(Math.max(detalle.venta.totalCentavos - detalle.venta.pagadoCentavos, 0)) }}
              </template>
            </dd>
          </div>
        </dl>

        <p
          v-if="warning && !modoEdicion"
          role="alert"
          class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >{{ warning }}</p>

        <!-- Error al guardar edición -->
        <div
          v-if="editError && modoEdicion"
          role="alert"
          class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ editError }}
        </div>

        <!-- Tabla de ítems -->
        <div class="mt-5 overflow-x-auto rounded-xl border border-[#D4A574]">
          <table class="min-w-full border-collapse text-sm">
            <thead class="bg-[#F5E6D3] text-left text-xs uppercase tracking-wide text-[#6B3A2A]">
              <tr>
                <th class="px-4 py-3">Producto</th>
                <th class="px-4 py-3 text-center">Cantidad</th>
                <th class="px-4 py-3 text-right">P. Venta</th>
                <th class="px-4 py-3 text-right">Subtotal</th>
                <th v-if="modoEdicion" class="px-4 py-3 text-center">Quitar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D4A574]/50">
              <!-- MODO EDICIÓN -->
              <template v-if="modoEdicion">
                <tr
                  v-for="item in detalle.items"
                  v-show="!itemsEliminadosIds.has(item.id)"
                  :key="item.id"
                >
                  <td class="px-4 py-3 font-medium text-gray-900">{{ item.nombreProducto }}</td>
                  <td class="px-4 py-3 text-center text-gray-700">{{ item.cantidad }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">{{ formatBs(item.precioVentaUnitarioCentavos) }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ formatBs(item.subtotalCentavos) }}</td>
                  <td class="px-4 py-3 text-center">
                    <button
                      type="button"
                      :disabled="itemsVisibles.length <= 1 || editing"
                      class="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg p-1.5 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                      :title="itemsVisibles.length <= 1 ? 'Debe quedar al menos un producto en la venta' : `Quitar ${item.nombreProducto}`"
                      :aria-label="`Quitar ${item.nombreProducto} de la venta`"
                      @click="eliminarItem(item.id)"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </td>
                </tr>
                <tr v-if="itemsVisibles.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-gray-500">No quedan ítems.</td>
                </tr>
              </template>
              <!-- MODO VISUALIZACIÓN -->
              <template v-else>
                <tr
                  v-for="item in detalle.items"
                  :key="item.id"
                >
                  <td class="px-4 py-3 font-medium text-gray-900">{{ item.nombreProducto }}</td>
                  <td class="px-4 py-3 text-center text-gray-700">{{ item.cantidad }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">{{ formatBs(item.precioVentaUnitarioCentavos) }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ formatBs(item.subtotalCentavos) }}</td>
                </tr>
                <tr v-if="!detalle.items.length">
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">No se encontraron ítems históricos.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pie del modal -->
        <div class="mt-5 flex flex-wrap justify-end gap-3">
          <!-- Modo edición: Cancelar + Guardar -->
          <template v-if="modoEdicion">
            <button
              type="button"
              :disabled="editing"
              class="min-h-11 rounded-lg border border-[#D4A574] px-5 py-2.5 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:opacity-60"
              @click="cancelarEdicion"
            >Cancelar</button>
            <button
              type="button"
              :disabled="!hayItemsEliminados || editing"
              class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#6B3A2A] px-5 py-2.5 font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60"
              @click="guardarEdicion"
            >
              <span
                v-if="editing"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden="true"
              />
              {{ editing ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </template>
          <!-- Modo visualización: Cerrar -->
          <template v-else>
            <button
              type="button"
              class="min-h-11 rounded-lg border border-[#D4A574] px-5 py-2.5 font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              @click="requestClose"
            >Cerrar</button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
