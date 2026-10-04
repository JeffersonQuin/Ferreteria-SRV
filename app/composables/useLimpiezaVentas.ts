import type { SupabaseClient } from '@supabase/supabase-js'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCount(value: unknown) {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function isValidDate(value: string) {
  if (!FECHA_REGEX.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime())
}

/**
 * Elimina ventas (y sus ítems) dentro de un rango de fechas para liberar espacio.
 * Usa `eliminar_ventas_por_rango`: primero en modo "solo contar" para previsualizar
 * y luego en modo borrado. La RPC aún no está en database.types.ts, por eso el
 * cliente se usa sin tipos de esquema.
 */
export function useLimpiezaVentas() {
  const supabase = useSupabaseClient() as unknown as SupabaseClient

  const fechaDesde = ref('')
  const fechaHasta = ref('')
  const errorFecha = ref<string | null>(null)
  const contando = ref(false)
  const eliminando = ref(false)
  const error = ref<string | null>(null)
  const coincidencias = ref<number | null>(null)
  const ultimasEliminadas = ref<number | null>(null)

  function validarRango() {
    if (!fechaDesde.value || !fechaHasta.value) {
      errorFecha.value = 'Selecciona las fechas "Desde" y "Hasta".'
      return false
    }
    if (!isValidDate(fechaDesde.value) || !isValidDate(fechaHasta.value)) {
      errorFecha.value = 'Las fechas seleccionadas no son válidas.'
      return false
    }
    if (fechaDesde.value > fechaHasta.value) {
      errorFecha.value = 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".'
      return false
    }
    errorFecha.value = null
    return true
  }

  async function llamarRpc(soloContar: boolean) {
    const { data, error: rpcError } = await supabase.rpc('eliminar_ventas_por_rango', {
      p_desde: fechaDesde.value,
      p_hasta: fechaHasta.value,
      p_solo_contar: soloContar
    })
    if (rpcError) throw new Error(rpcError.message)
    if (!isRecord(data)) throw new Error('Supabase devolvió una respuesta inesperada.')
    return data
  }

  /** Previsualiza cuántas ventas caen en el rango. Devuelve null si falla. */
  async function contarVentas() {
    if (contando.value || eliminando.value) return null
    error.value = null
    ultimasEliminadas.value = null
    coincidencias.value = null
    if (!validarRango()) return null

    contando.value = true
    try {
      const data = await llamarRpc(true)
      const total = readCount(data.coincidencias)
      if (total === null) throw new Error('Supabase devolvió un conteo no válido.')
      coincidencias.value = total
      return total
    } catch (cause) {
      console.error('[Configuracion] No fue posible contar las ventas del rango', cause)
      error.value = cause instanceof Error && cause.message
        ? cause.message
        : 'No fue posible consultar las ventas del rango.'
      return null
    } finally {
      contando.value = false
    }
  }

  /** Elimina las ventas del rango. Devuelve cuántas se eliminaron o null si falla. */
  async function eliminarVentas() {
    if (eliminando.value || contando.value) return null
    error.value = null
    if (!validarRango()) return null

    eliminando.value = true
    try {
      const data = await llamarRpc(false)
      const eliminadas = readCount(data.eliminadas)
      if (eliminadas === null) throw new Error('Supabase devolvió un resultado no válido.')
      ultimasEliminadas.value = eliminadas
      coincidencias.value = null
      return eliminadas
    } catch (cause) {
      console.error('[Configuracion] No fue posible eliminar las ventas del rango', cause)
      error.value = cause instanceof Error && cause.message
        ? cause.message
        : 'No fue posible eliminar las ventas del rango.'
      return null
    } finally {
      eliminando.value = false
    }
  }

  function limpiarEstado() {
    if (eliminando.value) return
    error.value = null
    coincidencias.value = null
  }

  function limpiarRango() {
    fechaDesde.value = ''
    fechaHasta.value = ''
    errorFecha.value = null
    error.value = null
    coincidencias.value = null
  }

  // Si el usuario cambia el rango, el conteo previo deja de ser válido.
  watch([fechaDesde, fechaHasta], () => {
    if (eliminando.value) return
    coincidencias.value = null
    errorFecha.value = null
  })

  return {
    fechaDesde,
    fechaHasta,
    errorFecha,
    contando,
    eliminando,
    error,
    coincidencias,
    ultimasEliminadas,
    contarVentas,
    eliminarVentas,
    limpiarEstado,
    limpiarRango
  }
}
