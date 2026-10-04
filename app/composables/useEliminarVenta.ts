import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Elimina una venta (y sus ítems) mediante la RPC `eliminar_venta`.
 * La RPC aún no está en database.types.ts, por eso el cliente se usa sin tipos de esquema.
 */
export function useEliminarVenta() {
  const supabase = useSupabaseClient() as unknown as SupabaseClient
  const deleting = ref(false)
  const deleteError = ref<string | null>(null)

  async function eliminarVenta(ventaId: number): Promise<boolean> {
    if (deleting.value) return false
    if (!Number.isSafeInteger(ventaId) || ventaId <= 0) {
      deleteError.value = 'El identificador de la venta no es válido.'
      return false
    }

    deleting.value = true
    deleteError.value = null

    try {
      const { error } = await supabase.rpc('eliminar_venta', { p_venta_id: ventaId })
      if (error) throw new Error(error.message)
      return true
    } catch (cause) {
      console.error('[HistorialVentas] No fue posible eliminar la venta', cause)
      deleteError.value = cause instanceof Error && cause.message
        ? cause.message
        : 'No fue posible eliminar la venta.'
      return false
    } finally {
      deleting.value = false
    }
  }

  function clearDeleteError() {
    if (deleting.value) return
    deleteError.value = null
  }

  return { deleting, deleteError, eliminarVenta, clearDeleteError }
}
