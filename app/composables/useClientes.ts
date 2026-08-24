import type { Database } from '~/types/database.types'

export type Cliente = Database['public']['Tables']['clientes']['Row']
export type ClientePayload = Pick<Cliente, 'nombre' | 'celular'>

export function useClientes() {
  const supabase = useSupabaseClient<Database>()
  const clientes = ref<Cliente[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const mutationError = ref<string | null>(null)

  function sortClientes(items: Cliente[]) {
    return [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }

  function reportError(context: string, cause: unknown, message: string) {
    console.error(`[Clientes] ${context}`, cause)
    return message
  }

  async function fetchClientes() {
    loading.value = true
    error.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true })

      if (requestError) {
        error.value = reportError(
          'Error al consultar clientes',
          requestError,
          'No fue posible cargar los clientes. Intenta nuevamente.'
        )
        return false
      }

      clientes.value = data ?? []
      return true
    } catch (cause) {
      error.value = reportError(
        'Error inesperado al consultar clientes',
        cause,
        'No fue posible cargar los clientes. Intenta nuevamente.'
      )
      return false
    } finally {
      loading.value = false
    }
  }

  async function createCliente(payload: ClientePayload) {
    saving.value = true
    mutationError.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('clientes')
        .insert(payload)
        .select('*')
        .single()

      if (requestError) {
        mutationError.value = reportError(
          'Error al registrar cliente',
          requestError,
          'No fue posible registrar el cliente.'
        )
        return null
      }

      clientes.value = sortClientes([...clientes.value, data])
      return data
    } catch (cause) {
      mutationError.value = reportError(
        'Error inesperado al registrar cliente',
        cause,
        'No fue posible registrar el cliente.'
      )
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateCliente(id: number, payload: ClientePayload) {
    saving.value = true
    mutationError.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (requestError) {
        mutationError.value = reportError(
          'Error al actualizar cliente',
          requestError,
          'No fue posible actualizar el cliente.'
        )
        return null
      }

      clientes.value = sortClientes(
        clientes.value.map(cliente => cliente.id === id ? data : cliente)
      )
      return data
    } catch (cause) {
      mutationError.value = reportError(
        'Error inesperado al actualizar cliente',
        cause,
        'No fue posible actualizar el cliente.'
      )
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteCliente(id: number) {
    deleting.value = true
    mutationError.value = null

    try {
      const { data, error: requestError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()

      if (requestError || !data) {
        mutationError.value = reportError(
          'Error al eliminar cliente',
          requestError ?? { id, reason: 'La operación no afectó ningún registro.' },
          'No fue posible eliminar el cliente. Verifica que exista y que tengas permisos.'
        )
        return false
      }

      clientes.value = clientes.value.filter(cliente => cliente.id !== data.id)
      return true
    } catch (cause) {
      mutationError.value = reportError(
        'Error inesperado al eliminar cliente',
        cause,
        'No fue posible eliminar el cliente.'
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
    clientes,
    loading,
    saving,
    deleting,
    error,
    mutationError,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    clearMutationError
  }
}
