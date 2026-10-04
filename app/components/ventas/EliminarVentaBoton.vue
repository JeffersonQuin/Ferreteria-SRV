<script setup lang="ts">
import EliminarVentaModal from '~/components/ventas/EliminarVentaModal.vue'
import type { HistorialVenta } from '~/composables/useHistorialVentas'

// Botón "Eliminar venta" para la columna Opciones del historial: incluye el modal
// de confirmación y la llamada a la RPC. Avisa al padre con `deleted` al terminar.
const props = defineProps<{
  venta: HistorialVenta
  disabled?: boolean
}>()

const emit = defineEmits<{
  deleted: [ventaId: number]
}>()

const { deleting, deleteError, eliminarVenta, clearDeleteError } = useEliminarVenta()
const open = ref(false)

function openModal() {
  if (props.disabled || deleting.value) return
  clearDeleteError()
  open.value = true
}

function closeModal() {
  if (deleting.value) return
  open.value = false
  clearDeleteError()
}

async function confirmDelete() {
  const ventaId = props.venta.id
  const deleted = await eliminarVenta(ventaId)
  if (!deleted) return // deleteError se muestra dentro del modal para poder reintentar

  open.value = false
  emit('deleted', ventaId)
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled || deleting"
    class="min-h-10 min-w-10 rounded-lg p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
    :aria-label="`Eliminar venta ${venta.id}`"
    title="Eliminar Venta"
    @click="openModal"
  >
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  </button>

  <Teleport to="#teleports">
    <EliminarVentaModal
      :open="open"
      :venta="venta"
      :deleting="deleting"
      :error="deleteError"
      @close="closeModal"
      @confirm="confirmDelete"
    />
  </Teleport>
</template>
