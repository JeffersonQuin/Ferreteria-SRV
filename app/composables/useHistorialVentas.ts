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
  id: number
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
  filtroFechaDesde: string
  filtroFechaHasta: string
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

// ── Resumen diario (Spec 015) ──────────────────────────────────────────────
export type ResumenDiaVenta = {
  id: number
  clienteNombre: string
  totalCentavos: number
  gananciaTotalCentavos: number
  estado: VentaEstado
}

export type ResumenDia = {
  fecha: string
  ventas: ResumenDiaVenta[]
  totalVentasCentavos: number
  totalGananciasCentavos: number
}
// ──────────────────────────────────────────────────────────────────────────

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

export function parseHistorialVenta(value: unknown): HistorialVenta | null {
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

export function parseHistorialItem(value: unknown): HistorialVentaItem | null {
  if (!isRecord(value)) return null

  const id = readPositiveInteger(value.id)
  const ventaId = readPositiveInteger(value.venta_id)
  const productoId = readPositiveInteger(value.producto_id, true)
  const cantidad = readPositiveInteger(value.cantidad)
  const precioVentaUnitarioCentavos = readMoneyCents(value.precio_venta_unitario)
  const subtotalCentavos = readMoneyCents(value.subtotal)

  if (
    id === undefined
    || ventaId === undefined
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
  // ── Filtros de fecha (Corrección 2 - Spec 012) ─────────────────────────────
  const fechaDesde = ref('')
  const fechaHasta = ref('')
  const errorFecha = ref<string | null>(null)
  // ──────────────────────────────────────────────────────────────────────────
  const filtrosAplicados = ref({
    cliente: '',
    estado: 'Todos' as HistorialEstadoFiltro,
    fechaDesde: '',
    fechaHasta: ''
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const detalle = shallowRef<HistorialVentaDetalle | null>(null)
  const detalleLoading = ref(false)
  const detalleError = ref<string | null>(null)
  const detalleAdvertencia = ref<string | null>(null)
  const itemsCache = new Map<number, HistorialVentaItem[]>()

  // ── Estado de edición de venta (Corrección 1 - Spec 012) ──────────────────
  const editing = ref(false)
  const editError = ref<string | null>(null)
  // ──────────────────────────────────────────────────────────────────────────

  const paying = ref(false)
  const pagoError = ref<string | null>(null)
  const ultimoPago = shallowRef<PagoVentaResultado | null>(null)

  const exporting = ref(false)
  const exportError = ref<string | null>(null)
  const reporte = shallowRef<HistorialReporte | null>(null)

  // ── Resumen diario (Spec 015) ────────────────────────────────────────────
  const resumenDia = shallowRef<ResumenDia | null>(null)
  const resumenDiaLoading = ref(false)
  const resumenDiaError = ref<string | null>(null)
  // ────────────────────────────────────────────────────────────────────────

  const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
  const hasPreviousPage = computed(() => page.value > 1)
  const hasNextPage = computed(() => page.value < totalPages.value)

  let listRequestId = 0
  let detailRequestId = 0
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  function escapeLikePattern(value: string) {
    return value.replace(/[\\%_]/g, match => `\\${match}`)
  }

  // ── Valida coherencia de fechas ────────────────────────────────────────────
  function validarFechas(desde: string, hasta: string): boolean {
    if (!desde || !hasta) return true
    return desde <= hasta
  }

  function applyFilters<T>(
    query: T,
    filters: { cliente: string; estado: HistorialEstadoFiltro; fechaDesde: string; fechaHasta: string }
  ) {
    let filtered = query as T & {
      ilike: (column: 'cliente_nombre', pattern: string) => typeof filtered
      eq: (column: 'estado', value: VentaEstado) => typeof filtered
      gte: (column: 'fecha', value: string) => typeof filtered
      lte: (column: 'fecha', value: string) => typeof filtered
    }
    if (filters.cliente) {
      filtered = filtered.ilike('cliente_nombre', `%${escapeLikePattern(filters.cliente)}%`)
    }
    if (filters.estado !== 'Todos') filtered = filtered.eq('estado', filters.estado)
    // Filtros de fecha
    if (filters.fechaDesde) {
      filtered = filtered.gte('fecha', `${filters.fechaDesde}T00:00:00`)
    }
    if (filters.fechaHasta) {
      filtered = filtered.lte('fecha', `${filters.fechaHasta}T23:59:59`)
    }
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
      estado: estadoFiltro.value,
      fechaDesde: fechaDesde.value,
      fechaHasta: fechaHasta.value
    }

    // Validar coherencia de fechas antes de aplicar
    if (!validarFechas(next.fechaDesde, next.fechaHasta)) {
      errorFecha.value = 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".'
      return
    }
    errorFecha.value = null

    if (
      next.cliente === filtrosAplicados.value.cliente
      && next.estado === filtrosAplicados.value.estado
      && next.fechaDesde === filtrosAplicados.value.fechaDesde
      && next.fechaHasta === filtrosAplicados.value.fechaHasta
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

  // Watchers para filtros de fecha con debounce de 300 ms
  watch(fechaDesde, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(applyCurrentFilters, 300)
  })

  watch(fechaHasta, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(applyCurrentFilters, 300)
  })

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
    editError.value = null
  }

  // ── Editar venta: eliminar ítems y recalcular totales (Corrección 1) ────────
  async function editarVenta(ventaId: number, itemsAEliminar: number[]): Promise<HistorialVenta | null> {
    if (editing.value) return null
    editing.value = true
    editError.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('editar_venta', {
        p_venta_id: ventaId,
        p_items_a_eliminar: itemsAEliminar
      })

      if (rpcError) throw new Error(rpcError.message)

      const ventaActualizada = parseHistorialVenta(data)
      if (!ventaActualizada) {
        throw new Error('La RPC devolvió un formato inesperado al editar la venta.')
      }

      // Actualizar la lista del historial
      ventas.value = ventas.value.map(v => v.id === ventaActualizada.id ? ventaActualizada : v)

      // Actualizar el detalle actual si corresponde a esta venta
      if (detalle.value?.venta.id === ventaId) {
        // Invalidar caché de ítems para forzar recarga desde BD en la próxima apertura
        itemsCache.delete(ventaId)
      }

      // Invalidar reporte si hay uno activo
      reporte.value = null

      return ventaActualizada
    } catch (cause) {
      console.error('[HistorialVentas] No fue posible editar la venta', cause)
      editError.value = errorMessage(cause, 'No fue posible guardar los cambios de la venta.')
      return null
    } finally {
      editing.value = false
    }
  }

  function clearEditError() {
    editError.value = null
  }
  // ──────────────────────────────────────────────────────────────────────────

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
      estado: estadoFiltro.value,
      fechaDesde: fechaDesde.value,
      fechaHasta: fechaHasta.value
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
        filtroFechaDesde: filters.fechaDesde,
        filtroFechaHasta: filters.fechaHasta,
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

  // ── Resumen diario (Spec 015) ────────────────────────────────────────────
  async function loadResumenDia(fecha: string): Promise<ResumenDia | null> {
    if (resumenDiaLoading.value) return null
    resumenDiaLoading.value = true
    resumenDiaError.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('ventas')
        .select(VENTA_COLUMNS)
        .gte('fecha', `${fecha}T00:00:00`)
        .lte('fecha', `${fecha}T23:59:59`)
        .order('fecha', { ascending: true })
        .order('id', { ascending: true })

      if (queryError) throw new Error(queryError.message)

      const parsed = (data ?? []).map(parseHistorialVenta)
      if (parsed.some(v => v === null)) {
        throw new Error('Supabase devolvió una venta con un formato no válido.')
      }
      const ventasDia = parsed as HistorialVenta[]

      let totalVentasCentavos = 0
      let totalGananciasCentavos = 0
      for (const v of ventasDia) {
        totalVentasCentavos = safeAdd(totalVentasCentavos, v.totalCentavos)
        totalGananciasCentavos = safeAdd(totalGananciasCentavos, v.gananciaTotalCentavos)
      }

      resumenDia.value = {
        fecha,
        ventas: ventasDia.map(v => ({
          id: v.id,
          clienteNombre: v.clienteNombre,
          totalCentavos: v.totalCentavos,
          gananciaTotalCentavos: v.gananciaTotalCentavos,
          estado: v.estado
        })),
        totalVentasCentavos,
        totalGananciasCentavos
      }
      return resumenDia.value
    } catch (cause) {
      console.error('[HistorialVentas] No fue posible cargar el resumen del día', cause)
      resumenDiaError.value = errorMessage(cause, 'No fue posible cargar el resumen del día.')
      resumenDia.value = null
      return null
    } finally {
      resumenDiaLoading.value = false
    }
  }

  function clearResumenDia() {
    resumenDia.value = null
    resumenDiaError.value = null
    resumenDiaLoading.value = false
  }
  // ────────────────────────────────────────────────────────────────────────

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
    fechaDesde,
    fechaHasta,
    errorFecha,
    loading,
    error,
    detalle,
    detalleLoading,
    detalleError,
    detalleAdvertencia,
    editing,
    editError,
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
    editarVenta,
    clearEditError,
    limpiarFiltrosFecha,
    completePayment,
    clearPaymentState,
    loadReport,
    clearReport,
    resumenDia,
    resumenDiaLoading,
    resumenDiaError,
    loadResumenDia,
    clearResumenDia
  }
}
