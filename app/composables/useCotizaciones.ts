import type { Cliente } from '~/composables/useClientes'
import type { Database, Json } from '~/types/database.types'
import { toCents } from '~/utils/money'

export type CotizacionCarritoItem = {
  productoId: number
  nombre: string
  precioVentaCentavos: number
  precioCostoCentavos: number
  cantidad: number
}

export type CotizacionRegistradaItem = {
  productoId: number | null
  nombreProducto: string
  cantidad: number
  precioVentaUnitarioCentavos: number
  subtotalCentavos: number
}

export type CotizacionRegistrada = {
  id: number
  fecha: string
  clienteId: number
  clienteNombre: string
  clienteCelular: string | null
  totalCentavos: number
  gananciaTotalCentavos: number
  items: CotizacionRegistradaItem[]
}

export type CotizacionComprobanteSnapshot = Readonly<Omit<CotizacionRegistrada, 'items'> & {
  items: ReadonlyArray<Readonly<CotizacionRegistradaItem>>
}>

// La RPC `registrar_cotizacion` aún no está en database.types.ts, por eso se tipa localmente.
type UntypedRpc = (
  fn: string,
  args: Record<string, Json>
) => PromiseLike<{ data: Json | null, error: unknown }>

function isRecord(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFiniteNumber(value: Json | undefined) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readInteger(value: Json | undefined, allowNull = false) {
  if (allowNull && value === null) return null
  const parsed = readFiniteNumber(value)
  return parsed !== null && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

function readMoneyCents(value: Json | undefined, allowNegative = false) {
  const amount = readFiniteNumber(value)
  if (amount === null || (!allowNegative && amount < 0)) return null
  return toCents(amount)
}

function parseCotizacionItem(value: Json): CotizacionRegistradaItem | null {
  if (!isRecord(value)) return null

  const productoId = readInteger(value.producto_id, true)
  const cantidad = readInteger(value.cantidad)
  const precioVentaUnitarioCentavos = readMoneyCents(value.precio_venta_unitario)
  const subtotalCentavos = readMoneyCents(value.subtotal)

  if (
    productoId === undefined
    || cantidad === undefined
    || typeof value.nombre_producto !== 'string'
    || !value.nombre_producto.trim()
    || precioVentaUnitarioCentavos === null
    || subtotalCentavos === null
  ) return null

  const subtotalCalculado = precioVentaUnitarioCentavos * cantidad
  // Tolerancia de ±1 centavo por redondeo decimal
  if (!Number.isSafeInteger(subtotalCalculado) || Math.abs(subtotalCalculado - subtotalCentavos) > 1) return null

  return {
    productoId,
    nombreProducto: value.nombre_producto,
    cantidad,
    precioVentaUnitarioCentavos,
    subtotalCentavos
  }
}

export function parseCotizacionRegistrada(value: Json): CotizacionRegistrada | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null

  const cotizacion = isRecord(value.cotizacion) ? value.cotizacion : value
  const cliente = isRecord(value.cliente) ? value.cliente : cotizacion
  const id = readInteger(cotizacion.id)
  const clienteId = readInteger(cotizacion.cliente_id ?? cliente.id)
  const fecha = cotizacion.fecha ?? value.fecha
  const clienteNombre = cotizacion.cliente_nombre ?? cliente.nombre
  const clienteCelular = cotizacion.cliente_celular ?? cliente.celular ?? null
  const totalCentavos = readMoneyCents(cotizacion.total ?? value.total)
  const gananciaTotalCentavos = readMoneyCents(cotizacion.ganancia_total ?? value.ganancia_total, true)

  const items: CotizacionRegistradaItem[] = []
  for (const rawItem of value.items) {
    const item = parseCotizacionItem(rawItem)
    if (!item) return null
    items.push(item)
  }

  if (
    id === undefined
    || clienteId === undefined
    || typeof fecha !== 'string'
    || !fecha.trim()
    || Number.isNaN(Date.parse(fecha))
    || typeof clienteNombre !== 'string'
    || !clienteNombre.trim()
    || (clienteCelular !== null && typeof clienteCelular !== 'string')
    || totalCentavos === null
    || gananciaTotalCentavos === null
    || items.length === 0
  ) return null

  const itemsTotalCentavos = items.reduce((total, item) => total + item.subtotalCentavos, 0)
  if (!Number.isSafeInteger(itemsTotalCentavos) || itemsTotalCentavos !== totalCentavos) return null

  return {
    id,
    fecha,
    clienteId,
    clienteNombre,
    clienteCelular,
    totalCentavos,
    gananciaTotalCentavos,
    items
  }
}

function createComprobanteSnapshot(cotizacion: CotizacionRegistrada): CotizacionComprobanteSnapshot {
  const items = Object.freeze(cotizacion.items.map(item => Object.freeze({ ...item })))
  return Object.freeze({ ...cotizacion, items })
}

export function useCotizaciones() {
  const supabase = useSupabaseClient<Database>()
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc

  const clienteSeleccionado = ref<Cliente | null>(null)
  const carrito = ref<CotizacionCarritoItem[]>([])
  const registering = ref(false)
  const error = ref<string | null>(null)
  const cotizacionRegistrada = ref<CotizacionRegistrada | null>(null)
  const comprobante = shallowRef<CotizacionComprobanteSnapshot | null>(null)

  const numeroArticulos = computed(() =>
    carrito.value.reduce((total, item) => total + item.cantidad, 0)
  )
  const totalCentavos = computed(() =>
    carrito.value.reduce((total, item) => total + item.precioVentaCentavos * item.cantidad, 0)
  )
  const gananciaCentavos = computed(() =>
    carrito.value.reduce(
      (total, item) => total + (item.precioVentaCentavos - item.precioCostoCentavos) * item.cantidad,
      0
    )
  )
  const cantidadesValidas = computed(() =>
    carrito.value.every(item => Number.isInteger(item.cantidad) && item.cantidad > 0)
  )
  const canRegister = computed(() =>
    Boolean(clienteSeleccionado.value)
    && carrito.value.length > 0
    && cantidadesValidas.value
    && !registering.value
    && !cotizacionRegistrada.value
  )
  const tieneDatosSinGuardar = computed(() =>
    Boolean(clienteSeleccionado.value || carrito.value.length)
  )

  function agregarProductoDirecto(
    productoId: number,
    nombre: string,
    precioVentaCentavos: number,
    precioCostoCentavos: number,
    cant: number
  ) {
    if (!Number.isInteger(cant) || cant < 1) return false
    const existente = carrito.value.find(item => item.productoId === productoId)
    if (existente) {
      existente.cantidad += cant
    } else {
      carrito.value.push({ productoId, nombre, precioVentaCentavos, precioCostoCentavos, cantidad: cant })
    }
    error.value = null
    return true
  }

  function actualizarCantidad(productoId: number, nuevaCantidad: number) {
    if (!Number.isInteger(nuevaCantidad) || nuevaCantidad < 1) return false
    const item = carrito.value.find(entry => entry.productoId === productoId)
    if (!item) return false
    item.cantidad = nuevaCantidad
    error.value = null
    return true
  }

  function actualizarPrecioVenta(productoId: number, nuevoPrecioCentavos: number) {
    if (!Number.isSafeInteger(nuevoPrecioCentavos) || nuevoPrecioCentavos <= 0) return false
    const item = carrito.value.find(entry => entry.productoId === productoId)
    if (!item) return false
    item.precioVentaCentavos = nuevoPrecioCentavos
    error.value = null
    return true
  }

  function eliminarProducto(productoId: number) {
    carrito.value = carrito.value.filter(item => item.productoId !== productoId)
    error.value = null
  }

  function limpiar() {
    clienteSeleccionado.value = null
    carrito.value = []
    error.value = null
    cotizacionRegistrada.value = null
    comprobante.value = null
  }

  async function registrarCotizacion() {
    if (registering.value) return null
    if (cotizacionRegistrada.value) {
      error.value = 'Esta cotización ya fue registrada.'
      return null
    }
    if (!clienteSeleccionado.value) {
      error.value = 'Selecciona un cliente para continuar.'
      return null
    }
    if (!carrito.value.length) {
      error.value = 'Agrega al menos un producto.'
      return null
    }
    if (!cantidadesValidas.value) {
      error.value = 'Todas las cantidades deben ser enteros mayores que cero.'
      return null
    }

    registering.value = true
    error.value = null

    try {
      const { data, error: requestError } = await rpc('registrar_cotizacion', {
        p_cliente_id: clienteSeleccionado.value.id,
        p_items: carrito.value.map(item => ({
          producto_id: item.productoId,
          cantidad: item.cantidad,
          precio_venta_unitario: item.precioVentaCentavos / 100
        }))
      })

      if (requestError || data === null) throw requestError ?? new Error('La RPC no devolvió datos.')
      const parsed = parseCotizacionRegistrada(data)
      if (!parsed) throw new Error('La RPC devolvió un formato inesperado.')

      cotizacionRegistrada.value = parsed
      comprobante.value = createComprobanteSnapshot(parsed)
      return parsed
    } catch (cause) {
      console.error('[Cotizaciones] Error al registrar cotización', cause)
      error.value = 'No fue posible registrar la cotización. Tus datos se conservaron para reintentar.'
      return null
    } finally {
      registering.value = false
    }
  }

  return {
    clienteSeleccionado,
    carrito,
    registering,
    error,
    cotizacionRegistrada,
    comprobante,
    numeroArticulos,
    totalCentavos,
    gananciaCentavos,
    cantidadesValidas,
    canRegister,
    tieneDatosSinGuardar,
    agregarProductoDirecto,
    actualizarCantidad,
    actualizarPrecioVenta,
    eliminarProducto,
    limpiar,
    registrarCotizacion
  }
}
