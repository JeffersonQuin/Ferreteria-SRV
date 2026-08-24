import type { Database } from '~/types/database.types'

export type Producto = Database['public']['Tables']['productos']['Row']
export type ProductoPayload = Pick<Producto, 'nombre' | 'descripcion' | 'precio_costo' | 'precio_venta'>

export function useProductos() {
  const supabase = useSupabaseClient<Database>()
  const productos = ref<Producto[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const mutationError = ref<string | null>(null)

  function sortProductos(items: Producto[]) {
    return [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }

  function reportError(context: string, cause: unknown, message: string) {
    console.error(`[Productos] ${context}`, cause)
    return message
  }

  async function fetchProductos() {
    loading.value = true
    error.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true })

      if (requestError) {
        error.value = reportError(
          'Error al consultar productos',
          requestError,
          'No fue posible cargar los productos. Intenta nuevamente.'
        )
        return false
      }

      productos.value = data ?? []
      return true
    } catch (cause) {
      error.value = reportError(
        'Error inesperado al consultar productos',
        cause,
        'No fue posible cargar los productos. Intenta nuevamente.'
      )
      return false
    } finally {
      loading.value = false
    }
  }

  async function createProducto(payload: ProductoPayload) {
    saving.value = true
    mutationError.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('productos')
        .insert(payload)
        .select('*')
        .single()

      if (requestError) {
        mutationError.value = reportError(
          'Error al registrar producto',
          requestError,
          'No fue posible registrar el producto.'
        )
        return null
      }

      productos.value = sortProductos([...productos.value, data])
      return data
    } catch (cause) {
      mutationError.value = reportError(
        'Error inesperado al registrar producto',
        cause,
        'No fue posible registrar el producto.'
      )
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateProducto(id: number, payload: ProductoPayload) {
    saving.value = true
    mutationError.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (requestError) {
        mutationError.value = reportError(
          'Error al actualizar producto',
          requestError,
          'No fue posible actualizar el producto.'
        )
        return null
      }

      productos.value = sortProductos(
        productos.value.map(producto => producto.id === id ? data : producto)
      )
      return data
    } catch (cause) {
      mutationError.value = reportError(
        'Error inesperado al actualizar producto',
        cause,
        'No fue posible actualizar el producto.'
      )
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteProducto(id: number) {
    deleting.value = true
    mutationError.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()

      if (requestError || !data) {
        mutationError.value = reportError(
          'Error al eliminar producto',
          requestError ?? { id, reason: 'La operación no afectó ningún registro.' },
          'No fue posible eliminar el producto. Verifica que exista y que tengas permisos.'
        )
        return false
      }

      productos.value = productos.value.filter(producto => producto.id !== data.id)
      return true
    } catch (cause) {
      mutationError.value = reportError(
        'Error inesperado al eliminar producto',
        cause,
        'No fue posible eliminar el producto.'
      )
      return false
    } finally {
      deleting.value = false
    }
  }

  function clearMutationError() {
    mutationError.value = null
  }

  return {
    productos,
    loading,
    saving,
    deleting,
    error,
    mutationError,
    fetchProductos,
    createProducto,
    updateProducto,
    deleteProducto,
    clearMutationError
  }
}
