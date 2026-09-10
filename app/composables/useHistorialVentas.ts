import type { Database, Json, VentaEstado } from '~/types/database.types'
import { fromCents, toCents } from '~/utils/money'

export type HistorialEstadoFiltro = VentaEstado | 'Todos'

export type HistorialVenta = {
  id: number
  clienteId: number | null
  clienteNombre: string
  clienteCelular: string | null
  fecha: string
  totalCentavos: number
  descuentoCentavos: number
  gananciaTotalCentavos: number
  pagadoCentavos: number
  estado: VentaEstado
}

export type HistorialVentaItem = {
  ventaId: number
  productoId: number | null
  nombreProducto: string
  cantidad: number
  precioVentaUnitarioCentavos: number
  subtotalCentavos: number
}

export type HistorialVentaDetalle = {
  venta: HistorialVenta
  items: HistorialVentaItem[]
  totalItemsCentavos: number
  tieneInconsistencia: boolean
}

export type HistorialReporte = {
  ventas: HistorialVenta[]
  generadoEn: string
  filtroCliente: string
  filtroEstado: HistorialEstadoFiltro
  totalVentasCentavos: number
  totalGananciasCentavos: number
}

export type PagoVentaResultado = {
  venta: HistorialVenta
  abonoCentavos: number
  saldoAnteriorCentavos: number
  montoAplicadoCentavos: number
  cambioCentavos: number
}

const VENTA_COLUMNS = 'id,cliente_id,cliente_nombre,cliente_celular,fecha,total,descuento,ganancia_total,pagado,estado,created_at'
const ITEM_COLUMNS = 'id,venta_id,producto_id,nombre_producto,cantidad,precio_venta_unitario,subtotal'
const PAGE_SIZE = 25
const REPORT_BATCH_SIZE = 500

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
  if (allowNull && value === null) return null
  const parsed = readFiniteNumber(value)
  return parsed !== null && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

function readMoneyCents(value: unknown, allowNegative = false) {
  const amount = readFiniteNumber(value)
  if (amount === null || (!allowNegative && amount < 0)) return null
  return toCents(amount)
}

function isVentaEstado(value: unknown): value is VentaEstado {
  return value === 'Completo' || value === 'Pendiente' || value === 'No pagado'
}

function parseHistorialVenta(value: unknown): HistorialVenta | null {
  if (!isRecord(value)) return null

  const id = readPositiveInteger(value.id)
  const clienteId = readPositiveInteger(value.cliente_id, true)
  const totalCentavos = readMoneyCents(value.total)
  const gananciaTotalCentavos = readMoneyCents(value.ganancia_total, true)
  const pagadoCentavos = readMoneyCents(value.pagado)
  
  // Leer descuento (puede ser null o ausente en ventas antiguas)
  const descuentoRaw = value.descuento
  const descuentoCentavos = descuentoRaw !== null && descuentoRaw !== undefined
    ? (readMoneyCents(descuentoRaw) ?? 0)
    : 0

  if (
    id === undefined
    || clienteId === undefined
    || typeof value.cliente_nombre !== 'string'
    || !value.cliente_nombre.trim()
    || (value.cliente_celular !== null && typeof value.cliente_celular !== 'string')
    || typeof value.fecha !== 'string'
    || !value.fecha.trim()
    || Number.isNaN(Date.parse(value.fecha))
    || totalCentavos === null
    || gananciaTotalCentavos === null
    || pagadoCentavos === null
    || pagadoCentavos > totalCentavos
    || !isVentaEstado(value.estado)
  ) return null

  if (totalCentavos > 0) {
    const estadoEsperado: VentaEstado = pagadoCentavos === 0
      ? 'No pagado'
      : pagadoCentavos === totalCentavos
        ? 'Completo'
        : 'Pendiente'
    if (value.estado !== estadoEsperado) return null
  } else if (pagadoCentavos !== 0 || (value.estado !== 'Completo' && value.estado !== 'No pagado')) {
    return null
  }

  return {
    id,
    clienteId,
    clienteNombre: value.cliente_nombre.trim(),
    clienteCelular: value.cliente_celular,
    fecha: value.fecha,
    totalCentavos,
    descuentoCentavos,
    gananciaTotalCentavos,
    pagadoCentavos,
    estado: value.estado
  }
}

function parseHistorialItem(value: unknown): HistorialVentaItem | null {
  if (!isRecord(value)) return null

  const ventaId = readPositiveInteger(value.venta_id)
  const productoId = readPositiveInteger(value.producto_id, true)
  const cantidad = readPositiveInteger(value.cantidad)
  const precioVentaUnitarioCentavos = readMoneyCents(value.precio_venta_unitario)
  const subtotalCentavos = readMoneyCents(value.subtotal)

  if (
    ventaId === undefined
    || productoId === undefined
    || cantidad === undefined
    || typeof value.nombre_producto !== 'string'
    || !value.nombre_producto.trim()
    || precioVentaUnitarioCentavos === null
    || subtotalCentavos === null
  ) return null

  const subtotalCalculado = precioVentaUnitarioCentavos * cantidad
  if (!Number.isSafeInteger(subtotalCalculado) || subtotalCalculado !== subtotalCentavos) return null

  return {
    ventaId,
    productoId,
    nombreProducto: value.nombre_producto.trim(),
    cantidad,
    precioVentaUnitarioCentavos,
    subtotalCentavos
  }
}

function parsePagoResultado(
  value: Json,
  ventaIdEsperado: number,
  abonoEsperadoCentavos: number
): PagoVentaResultado | null {
  if (!isRecord(value) || !isRecord(value.venta) || !isRecord(value.pago)) return null

  const venta = parseHistorialVenta(value.venta)
  const abonoCentavos = readMoneyCents(value.pago.abono)
  const saldoAnteriorCentavos = readMoneyCents(value.pago.saldo_anterior)
  const montoAplicadoCentavos = readMoneyCents(value.pago.monto_aplicado)
  const cambioCentavos = readMoneyCents(value.pago.cambio)

  if (
    !venta
    || venta.id !== ventaIdEsperado
    || venta.estado !== 'Completo'
    || venta.pagadoCentavos !== venta.totalCentavos
    || abonoCentavos === null
    || saldoAnteriorCentavos === null
    || montoAplicadoCentavos === null
    || cambioCentavos === null
    || abonoCentavos !== abonoEsperadoCentavos
    || saldoAnteriorCentavos <= 0
    || montoAplicadoCentavos !== saldoAnteriorCentavos
    || cambioCentavos !== Math.max(abonoCentavos - saldoAnteriorCentavos, 0)
  ) return null

  return {
    venta,
    abonoCentavos,
    saldoAnteriorCentavos,
    montoAplicadoCentavos,
    cambioCentavos
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

export function useHistorialVentas() {
  const supabase = useSupabaseClient<Database>()
  const ventas = ref<HistorialVenta[]>([])
  const totalCount = ref(0)
  const page = ref(1)
  const pageSize = PAGE_SIZE
  const busquedaCliente = ref('')
  const estadoFiltro = ref<HistorialEstadoFiltro>('Todos')
  const filtrosAplicados = ref({ cliente: '', estado: 'Todos' as HistorialEstadoFiltro })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const detalle = shallowRef<HistorialVentaDetalle | null>(null)
  const detalleLoading = ref(false)
  const detalleError = ref<string | null>(null)
  const detalleAdvertencia = ref<string | null>(null)
  const itemsCache = new Map<number, HistorialVentaItem[]>()

  const paying = ref(false)
  const pagoError = ref<string | null>(null)
  const ultimoPago = shallowRef<PagoVentaResultado | null>(null)

  const exporting = ref(false)
  const exportError = ref<string | null>(null)
  const reporte = shallowRef<HistorialReporte | null>(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
  const hasPreviousPage = computed(() => page.value > 1)
  const hasNextPage = computed(() => page.value < totalPages.value)

  let listRequestId = 0
  let detailRequestId = 0
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  function escapeLikePattern(value: string) {
    return value.replace(/[\\%_]/g, match => `\\${match}`)
  }

  function applyFilters<T>(query: T, filters: { cliente: string, estado: HistorialEstadoFiltro }) {
    let filtered = query as T & {
      ilike: (column: 'cliente_nombre', pattern: string) => typeof filtered
      eq: (column: 'estado', value: VentaEstado) => typeof filtered
    }
    if (filters.cliente) {
      filtered = filtered.ilike('cliente_nombre', `%${escapeLikePattern(filters.cliente)}%`)
    }
    if (filters.estado !== 'Todos') filtered = filtered.eq('estado', filters.estado)
    return filtered
  }

  async function fetchVentas() {
    const requestId = ++listRequestId
    const currentPage = page.value
    const filters = { ...filtrosAplicados.value }
    loading.value = true
    error.value = null

    try {
      const from = (currentPage - 1) * pageSize
      const baseQuery = supabase
        .from('ventas')
        .select(VENTA_COLUMNS, { count: 'exact' })
      const query = applyFilters(baseQuery, filters)
      const { data, error: queryError, count } = await query
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + pageSize - 1)

      if (queryError) throw new Error(queryError.message)

      const parsed = (data ?? []).map(parseHistorialVenta)
      if (parsed.some(venta => venta === null)) {
        throw new Error('Supabase devolvió una venta con un formato no válido.')
      }

      if (requestId !== listRequestId) return
      ventas.value = parsed as HistorialVenta[]
      totalCount.value = count ?? 0

      const pages = Math.max(1, Math.ceil(totalCount.value / pageSize))
      if (page.value > pages) {
        page.value = pages
        await fetchVentas()
      }
    } catch (cause) {
      if (requestId !== listRequestId) return
      console.error('[HistorialVentas] No fue posible consultar ventas', cause)
      ventas.value = []
      totalCount.value = 0
      error.value = errorMessage(cause, 'No fue posible cargar el historial de ventas.')
    } finally {
      if (requestId === listRequestId) loading.value = false
    }
  }

  function applyCurrentFilters() {
    const next = {
      cliente: busquedaCliente.value.trim(),
      estado: estadoFiltro.value
    }
    if (
      next.cliente === filtrosAplicados.value.cliente
      && next.estado === filtrosAplicados.value.estado
    ) return

    filtrosAplicados.value = next
    page.value = 1
    void fetchVentas()
  }

  watch(busquedaCliente, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(applyCurrentFilters, 300)
  })

  watch(estadoFiltro, () => {
    if (searchTimer) clearTimeout(searchTimer)
    applyCurrentFilters()
  })

  onScopeDispose(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  async function goToPage(nextPage: number) {
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
    page.value = nextPage
    await fetchVentas()
  }

  async function loadDetail(venta: HistorialVenta, force = false) {
    const requestId = ++detailRequestId
    detalleLoading.value = true
    detalleError.value = null
    detalleAdvertencia.value = null

    try {
      let items = !force ? itemsCache.get(venta.id) : undefined
      if (!items) {
        const { data, error: queryError } = await supabase
          .from('venta_items')
          .select(ITEM_COLUMNS)
          .eq('venta_id', venta.id)
          .order('id', { ascending: true })

        if (queryError) throw new Error(queryError.message)
        const parsed = (data ?? []).map(parseHistorialItem)
        if (parsed.some(item => item === null)) {
          throw new Error('Supabase devolvió un ítem histórico con un formato no válido.')
        }
        items = parsed as HistorialVentaItem[]
        itemsCache.set(venta.id, items)
      }

      const totalItemsCentavos = items.reduce(
        (sum, item) => safeAdd(sum, item.subtotalCentavos),
        0
      )
      const tieneInconsistencia = totalItemsCentavos !== venta.totalCentavos

      if (requestId !== detailRequestId) return null
      detalle.value = { venta, items: [...items], totalItemsCentavos, tieneInconsistencia }
      if (tieneInconsistencia) {
        detalleAdvertencia.value = 'Los subtotales históricos no coinciden con la cabecera. Se conserva el total autoritativo de la venta.'
      }
      return detalle.value
    } catch (cause) {
      if (requestId !== detailRequestId) return null
      console.error('[HistorialVentas] No fue posible consultar el detalle', cause)
      detalle.value = null
      detalleError.value = errorMessage(cause, 'No fue posible cargar el detalle de la venta.')
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

  async function completePayment(venta: HistorialVenta, monto: string) {
    if (paying.value) return null

    const abonoCentavos = toCents(monto)
    const saldoCentavos = Math.max(venta.totalCentavos - venta.pagadoCentavos, 0)
    pagoError.value = null
    ultimoPago.value = null

    if (venta.estado === 'Completo' || saldoCentavos <= 0) {
      pagoError.value = 'La venta ya se encuentra pagada por completo.'
      return null
    }
    if (abonoCentavos === null || abonoCentavos <= 0) {
      pagoError.value = 'Ingresa un monto recibido válido y mayor que cero.'
      return null
    }
    if (abonoCentavos < saldoCentavos) {
      pagoError.value = 'El monto recibido debe cubrir todo el saldo pendiente.'
      return null
    }

    paying.value = true
    try {
      const { data, error: rpcError } = await supabase.rpc('registrar_pago_venta', {
        p_venta_id: venta.id,
        p_abono: fromCents(abonoCentavos)
      })
      if (rpcError) throw new Error(rpcError.message)

      const parsed = parsePagoResultado(data, venta.id, abonoCentavos)
      if (!parsed) {
        await fetchVentas()
        throw new Error('Supabase confirmó el pago con una respuesta inesperada. El historial fue actualizado para verificar el estado real.')
      }

      if (filtrosAplicados.value.estado === 'Todos') {
        ventas.value = ventas.value.map(item => item.id === parsed.venta.id ? parsed.venta : item)
      } else {
        ventas.value = ventas.value.filter(item => item.id !== parsed.venta.id)
        totalCount.value = Math.max(totalCount.value - 1, 0)
      }
      if (detalle.value?.venta.id === parsed.venta.id) {
        detalle.value = { ...detalle.value, venta: parsed.venta }
      }
      reporte.value = null
      ultimoPago.value = parsed
      return parsed
    } catch (cause) {
      console.error('[HistorialVentas] No fue posible completar el pago', cause)
      pagoError.value = errorMessage(cause, 'No fue posible completar el pago.')
      return null
    } finally {
      paying.value = false
    }
  }

  function clearPaymentState() {
    if (paying.value) return
    pagoError.value = null
    ultimoPago.value = null
  }

  async function loadReport() {
    if (exporting.value) return null
    exporting.value = true
    exportError.value = null
    reporte.value = null

    const filters = {
      cliente: busquedaCliente.value.trim(),
      estado: estadoFiltro.value
    }
    const collected: HistorialVenta[] = []

    try {
      let offset = 0
      while (true) {
        const baseQuery = supabase.from('ventas').select(VENTA_COLUMNS)
        const query = applyFilters(baseQuery, filters)
        const { data, error: queryError } = await query
          .order('fecha', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + REPORT_BATCH_SIZE - 1)

        if (queryError) throw new Error(queryError.message)
        const parsed = (data ?? []).map(parseHistorialVenta)
        if (parsed.some(venta => venta === null)) {
          throw new Error('Supabase devolvió datos no válidos al preparar el reporte.')
        }

        collected.push(...parsed as HistorialVenta[])
        if ((data?.length ?? 0) < REPORT_BATCH_SIZE) break
        offset += REPORT_BATCH_SIZE
      }

      if (!collected.length) throw new Error('No existen ventas para exportar con los filtros actuales.')

      let totalVentasCentavos = 0
      let totalGananciasCentavos = 0
      for (const venta of collected) {
        totalVentasCentavos = safeAdd(totalVentasCentavos, venta.totalCentavos)
        totalGananciasCentavos = safeAdd(totalGananciasCentavos, venta.gananciaTotalCentavos)
      }

      reporte.value = {
        ventas: collected,
        generadoEn: new Date().toISOString(),
        filtroCliente: filters.cliente,
        filtroEstado: filters.estado,
        totalVentasCentavos,
        totalGananciasCentavos
      }
      return reporte.value
    } catch (cause) {
      console.error('[HistorialVentas] No fue posible preparar el reporte', cause)
      exportError.value = errorMessage(cause, 'No fue posible preparar el reporte de ventas.')
      return null
    } finally {
      exporting.value = false
    }
  }

  function clearReport() {
    reporte.value = null
    exportError.value = null
  }

  return {
    ventas,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    busquedaCliente,
    estadoFiltro,
    loading,
    error,
    detalle,
    detalleLoading,
    detalleError,
    detalleAdvertencia,
    paying,
    pagoError,
    ultimoPago,
    exporting,
    exportError,
    reporte,
    fetchVentas,
    goToPage,
    loadDetail,
    clearDetail,
    completePayment,
    clearPaymentState,
    loadReport,
    clearReport
  }
}
