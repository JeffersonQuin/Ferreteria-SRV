import type { SupabaseClient } from '@supabase/supabase-js'
import type { HistorialVentaDetalle } from '~/composables/useHistorialVentas'
import { parseHistorialItem, parseHistorialVenta } from '~/composables/useHistorialVentas'
import { fromCents, toCents } from '~/utils/money'

export type HistorialCotizacion = {
  id: number
  clienteId: number | null
  clienteNombre: string
  clienteCelular: string | null
  fecha: string
  totalCentavos: number
  gananciaTotalCentavos: number
  /** null = aún no convertida en venta */
  ventaId: number | null
}

export type HistorialCotizacionItem = {
  id: number
  cotizacionId: number
  productoId: number | null
  nombreProducto: string
  cantidad: number
  precioVentaUnitarioCentavos: number
  subtotalCentavos: number
}

export type HistorialCotizacionDetalle = {
  cotizacion: HistorialCotizacion
  items: HistorialCotizacionItem[]
  totalItemsCentavos: number
  tieneInconsistencia: boolean
}

export type ConversionResultado = {
  cotizacionId: number
  /** Venta creada, con el formato que usa el comprobante histórico de ventas. */
  detalle: HistorialVentaDetalle
  montoIngresadoCentavos: number
  cambioCentavos: number
}

// Las tablas de cotización y la RPC aún no están en database.types.ts,
// por eso el cliente se usa sin tipos de esquema.
const COTIZACION_COLUMNS = 'id,cliente_id,cliente_nombre,cliente_celular,fecha,total,ganancia_total,venta_id,created_at'
const ITEM_COLUMNS = 'id,cotizacion_id,producto_id,nombre_producto,cantidad,precio_venta_unitario,subtotal'
const PAGE_SIZE = 25

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFiniteNumber(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readPositiveInteger(value: unknown, allowNull = false) {
  if (allowNull && (value === null || value === undefined)) return null
  const parsed = readFiniteNumber(value)
  return parsed !== null && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

function readMoneyCents(value: unknown, allowNegative = false) {
  const amount = readFiniteNumber(value)
  if (amount === null || (!allowNegative && amount < 0)) return null
  return toCents(amount)
}

function parseHistorialCotizacion(value: unknown): HistorialCotizacion | null {
  if (!isRecord(value)) return null

  const id = readPositiveInteger(value.id)
  const clienteId = readPositiveInteger(value.cliente_id, true)
  const ventaId = readPositiveInteger(value.venta_id, true)
  const totalCentavos = readMoneyCents(value.total)
  const gananciaTotalCentavos = readMoneyCents(value.ganancia_total, true)

  if (
    id === undefined
    || clienteId === undefined
    || ventaId === undefined
    || typeof value.cliente_nombre !== 'string'
    || !value.cliente_nombre.trim()
    || (value.cliente_celular !== null && value.cliente_celular !== undefined && typeof value.cliente_celular !== 'string')
    || typeof value.fecha !== 'string'
    || !value.fecha.trim()
    || Number.isNaN(Date.parse(value.fecha))
    || totalCentavos === null
    || gananciaTotalCentavos === null
  ) return null

  return {
    id,
    clienteId,
    clienteNombre: value.cliente_nombre.trim(),
    clienteCelular: typeof value.cliente_celular === 'string' ? value.cliente_celular : null,
    fecha: value.fecha,
    totalCentavos,
    gananciaTotalCentavos,
    ventaId
  }
}

function parseHistorialCotizacionItem(value: unknown): HistorialCotizacionItem | null {
  if (!isRecord(value)) return null

  const id = readPositiveInteger(value.id)
  const cotizacionId = readPositiveInteger(value.cotizacion_id)
  const productoId = readPositiveInteger(value.producto_id, true)
  const cantidad = readPositiveInteger(value.cantidad)
  const precioVentaUnitarioCentavos = readMoneyCents(value.precio_venta_unitario)
  const subtotalCentavos = readMoneyCents(value.subtotal)

  if (
    id === undefined
    || cotizacionId === undefined
    || productoId === undefined
    || cantidad === undefined
    || typeof value.nombre_producto !== 'string'
    || !value.nombre_producto.trim()
    || precioVentaUnitarioCentavos === null
    || subtotalCentavos === null
  ) return null

  // Tolerancia de ±1 centavo por redondeo de precio_venta_unitario * cantidad
  const subtotalCalculado = precioVentaUnitarioCentavos * cantidad
  if (!Number.isSafeInteger(subtotalCalculado) || Math.abs(subtotalCalculado - subtotalCentavos) > 1) return null

  return {
    id,
    cotizacionId,
    productoId,
    nombreProducto: value.nombre_producto.trim(),
    cantidad,
    precioVentaUnitarioCentavos,
    subtotalCentavos
  }
}

/**
 * Valida la respuesta de `convertir_cotizacion_a_venta` (mismo contrato que
 * `registrar_venta`) y la convierte al formato de comprobante histórico de ventas.
 */
function parseConversion(
  value: unknown,
  cotizacionIdEsperado: number,
  montoIngresadoCentavos: number,
  descuentoEsperadoCentavos: number
): ConversionResultado | null {
  if (!isRecord(value) || !isRecord(value.venta) || !Array.isArray(value.items)) return null

  const venta = parseHistorialVenta(value.venta)
  if (!venta) return null

  const items = value.items.map(parseHistorialItem)
  if (!items.length || items.some(item => item === null)) return null
  const validItems = items as NonNullable<(typeof items)[number]>[]

  const totalItemsCentavos = validItems.reduce((sum, item) => sum + item.subtotalCentavos, 0)
  if (
    !Number.isSafeInteger(totalItemsCentavos)
    || venta.descuentoCentavos !== descuentoEsperadoCentavos
    || totalItemsCentavos !== venta.totalCentavos + venta.descuentoCentavos
    || validItems.some(item => item.ventaId !== venta.id)
    || readPositiveInteger(value.cotizacion_id) !== cotizacionIdEsperado
  ) return null

  return {
    cotizacionId: cotizacionIdEsperado,
    detalle: {
      venta,
      items: validItems,
      totalItemsCentavos,
      tieneInconsistencia: false
    },
    montoIngresadoCentavos,
    cambioCentavos: Math.max(montoIngresadoCentavos - venta.totalCentavos, 0)
  }
}

function safeAdd(left: number, right: number) {
  const result = left + right
  if (!Number.isSafeInteger(result)) throw new Error('Los acumulados exceden el rango monetario permitido.')
  return result
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

export function useHistorialCotizaciones() {
  const supabase = useSupabaseClient() as unknown as SupabaseClient
  const cotizaciones = ref<HistorialCotizacion[]>([])
  const totalCount = ref(0)
  const page = ref(1)
  const pageSize = PAGE_SIZE
  const busquedaCliente = ref('')
  const fechaDesde = ref('')
  const fechaHasta = ref('')
  const errorFecha = ref<string | null>(null)
  const filtrosAplicados = ref({ cliente: '', fechaDesde: '', fechaHasta: '' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const detalle = shallowRef<HistorialCotizacionDetalle | null>(null)
  const detalleLoading = ref(false)
  const detalleError = ref<string | null>(null)
  const detalleAdvertencia = ref<string | null>(null)
  const itemsCache = new Map<number, HistorialCotizacionItem[]>()

  const converting = ref(false)
  const convertError = ref<string | null>(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
  const hasPreviousPage = computed(() => page.value > 1)
  const hasNextPage = computed(() => page.value < totalPages.value)

  let listRequestId = 0
  let detailRequestId = 0
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  function escapeLikePattern(value: string) {
    return value.replace(/[\\%_]/g, match => `\\${match}`)
  }

  async function fetchCotizaciones() {
    const requestId = ++listRequestId
    const currentPage = page.value
    const filters = { ...filtrosAplicados.value }
    loading.value = true
    error.value = null

    try {
      const from = (currentPage - 1) * pageSize
      let query = supabase
        .from('cotizaciones')
        .select(COTIZACION_COLUMNS, { count: 'exact' })

      if (filters.cliente) {
        query = query.ilike('cliente_nombre', `%${escapeLikePattern(filters.cliente)}%`)
      }
      if (filters.fechaDesde) query = query.gte('fecha', `${filters.fechaDesde}T00:00:00`)
      if (filters.fechaHasta) query = query.lte('fecha', `${filters.fechaHasta}T23:59:59`)

      const { data, error: queryError, count } = await query
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + pageSize - 1)

      if (queryError) throw new Error(queryError.message)

      const parsed = ((data ?? []) as unknown[]).map(parseHistorialCotizacion)
      if (parsed.some(cotizacion => cotizacion === null)) {
        throw new Error('Supabase devolvió una cotización con un formato no válido.')
      }

      if (requestId !== listRequestId) return
      cotizaciones.value = parsed as HistorialCotizacion[]
      totalCount.value = count ?? 0

      const pages = Math.max(1, Math.ceil(totalCount.value / pageSize))
      if (page.value > pages) {
        page.value = pages
        await fetchCotizaciones()
      }
    } catch (cause) {
      if (requestId !== listRequestId) return
      console.error('[HistorialCotizaciones] No fue posible consultar cotizaciones', cause)
      cotizaciones.value = []
      totalCount.value = 0
      error.value = errorMessage(cause, 'No fue posible cargar el historial de cotizaciones.')
    } finally {
      if (requestId === listRequestId) loading.value = false
    }
  }

  function applyCurrentFilters() {
    const next = {
      cliente: busquedaCliente.value.trim(),
      fechaDesde: fechaDesde.value,
      fechaHasta: fechaHasta.value
    }

    if (next.fechaDesde && next.fechaHasta && next.fechaDesde > next.fechaHasta) {
      errorFecha.value = 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".'
      return
    }
    errorFecha.value = null

    if (
      next.cliente === filtrosAplicados.value.cliente
      && next.fechaDesde === filtrosAplicados.value.fechaDesde
      && next.fechaHasta === filtrosAplicados.value.fechaHasta
    ) return

    filtrosAplicados.value = next
    page.value = 1
    void fetchCotizaciones()
  }

  function scheduleFilters() {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(applyCurrentFilters, 300)
  }

  watch(busquedaCliente, scheduleFilters)
  watch(fechaDesde, scheduleFilters)
  watch(fechaHasta, scheduleFilters)

  onScopeDispose(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  function limpiarFiltrosFecha() {
    fechaDesde.value = ''
    fechaHasta.value = ''
    errorFecha.value = null
  }

  async function goToPage(nextPage: number) {
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
    page.value = nextPage
    await fetchCotizaciones()
  }

  async function loadDetail(cotizacion: HistorialCotizacion, force = false) {
    const requestId = ++detailRequestId
    detalleLoading.value = true
    detalleError.value = null
    detalleAdvertencia.value = null

    try {
      let items = !force ? itemsCache.get(cotizacion.id) : undefined
      if (!items) {
        const { data, error: queryError } = await supabase
          .from('cotizacion_items')
          .select(ITEM_COLUMNS)
          .eq('cotizacion_id', cotizacion.id)
          .order('id', { ascending: true })

        if (queryError) throw new Error(queryError.message)
        const parsed = ((data ?? []) as unknown[]).map(parseHistorialCotizacionItem)
        if (parsed.some(item => item === null)) {
          throw new Error('Supabase devolvió un ítem de cotización con un formato no válido.')
        }
        items = parsed as HistorialCotizacionItem[]
        itemsCache.set(cotizacion.id, items)
      }

      const totalItemsCentavos = items.reduce((sum, item) => safeAdd(sum, item.subtotalCentavos), 0)
      const tieneInconsistencia = totalItemsCentavos !== cotizacion.totalCentavos

      if (requestId !== detailRequestId) return null
      detalle.value = { cotizacion, items: [...items], totalItemsCentavos, tieneInconsistencia }
      if (tieneInconsistencia) {
        detalleAdvertencia.value = 'Los subtotales históricos no coinciden con la cabecera. Se conserva el total autoritativo de la cotización.'
      }
      return detalle.value
    } catch (cause) {
      if (requestId !== detailRequestId) return null
      console.error('[HistorialCotizaciones] No fue posible consultar el detalle', cause)
      detalle.value = null
      detalleError.value = errorMessage(cause, 'No fue posible cargar el detalle de la cotización.')
      return null
    } finally {
      if (requestId === detailRequestId) detalleLoading.value = false
    }
  }

  function clearDetail() {
    detailRequestId += 1
    detalle.value = null
    detalleError.value = null
    detalleAdvertencia.value = null
    detalleLoading.value = false
  }

  /**
   * Convierte una cotización en venta vía RPC. `descuento` y `montoPagado` llegan
   * como texto del formulario (en Bs). En caso de error conserva todo para reintentar.
   */
  async function convertirAVenta(
    cotizacion: HistorialCotizacion,
    descuento: string,
    montoPagado: string
  ): Promise<ConversionResultado | null> {
    if (converting.value) return null
    convertError.value = null

    if (cotizacion.ventaId !== null) {
      convertError.value = 'Esta cotización ya fue convertida en una venta.'
      return null
    }

    const descuentoCentavos = descuento.trim() === '' ? 0 : toCents(descuento)
    const montoCentavos = toCents(montoPagado)

    if (descuentoCentavos === null || descuentoCentavos < 0) {
      convertError.value = 'Ingresa un descuento válido, mayor o igual a cero.'
      return null
    }
    if (descuentoCentavos > cotizacion.totalCentavos) {
      convertError.value = 'El descuento no puede superar el total de la cotización.'
      return null
    }
    if (montoCentavos === null || montoCentavos < 0) {
      convertError.value = 'Ingresa un monto pagado válido, mayor o igual a cero.'
      return null
    }

    converting.value = true
    try {
      const { data, error: rpcError } = await supabase.rpc('convertir_cotizacion_a_venta', {
        p_cotizacion_id: cotizacion.id,
        p_monto_ingresado: fromCents(montoCentavos),
        p_descuento: fromCents(descuentoCentavos)
      })
      if (rpcError) throw new Error(rpcError.message)

      const parsed = parseConversion(data, cotizacion.id, montoCentavos, descuentoCentavos)
      if (!parsed) {
        // La RPC pudo confirmar la conversión: se refresca para mostrar el estado real.
        await fetchCotizaciones()
        throw new Error('Supabase confirmó la conversión con una respuesta inesperada. El historial fue actualizado para verificar el estado real.')
      }

      // La cotización se conserva, pero queda marcada como convertida (sin botón de conversión).
      cotizaciones.value = cotizaciones.value.map(item =>
        item.id === cotizacion.id ? { ...item, ventaId: parsed.detalle.venta.id } : item
      )
      if (detalle.value?.cotizacion.id === cotizacion.id) {
        detalle.value = {
          ...detalle.value,
          cotizacion: { ...detalle.value.cotizacion, ventaId: parsed.detalle.venta.id }
        }
      }
      return parsed
    } catch (cause) {
      console.error('[HistorialCotizaciones] No fue posible convertir la cotización', cause)
      convertError.value = errorMessage(cause, 'No fue posible convertir la cotización en venta.')
      return null
    } finally {
      converting.value = false
    }
  }

  function clearConvertError() {
    if (converting.value) return
    convertError.value = null
  }

  const deleting = ref(false)
  const deleteError = ref<string | null>(null)

  /** Elimina la cotización (y sus ítems) vía RPC y la quita de la lista. */
  async function eliminarCotizacion(cotizacion: HistorialCotizacion): Promise<boolean> {
    if (deleting.value || converting.value) return false
    deleting.value = true
    deleteError.value = null

    try {
      const { error: rpcError } = await supabase.rpc('eliminar_cotizacion', {
        p_cotizacion_id: cotizacion.id
      })
      if (rpcError) throw new Error(rpcError.message)

      itemsCache.delete(cotizacion.id)
      cotizaciones.value = cotizaciones.value.filter(item => item.id !== cotizacion.id)
      totalCount.value = Math.max(totalCount.value - 1, 0)
      if (detalle.value?.cotizacion.id === cotizacion.id) clearDetail()
      // Si la página quedó vacía y existen más registros, se ajusta la página y se recarga.
      if (cotizaciones.value.length === 0 && totalCount.value > 0) {
        page.value = Math.min(page.value, totalPages.value)
        void fetchCotizaciones()
      }
      return true
    } catch (cause) {
      console.error('[HistorialCotizaciones] No fue posible eliminar la cotización', cause)
      deleteError.value = errorMessage(cause, 'No fue posible eliminar la cotización.')
      return false
    } finally {
      deleting.value = false
    }
  }

  function clearDeleteError() {
    deleteError.value = null
  }

  return {
    deleting,
    deleteError,
    eliminarCotizacion,
    clearDeleteError,
    cotizaciones,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    busquedaCliente,
    fechaDesde,
    fechaHasta,
    errorFecha,
    loading,
    error,
    detalle,
    detalleLoading,
    detalleError,
    detalleAdvertencia,
    converting,
    convertError,
    fetchCotizaciones,
    goToPage,
    loadDetail,
    clearDetail,
    limpiarFiltrosFecha,
    convertirAVenta,
    clearConvertError
  }
}
