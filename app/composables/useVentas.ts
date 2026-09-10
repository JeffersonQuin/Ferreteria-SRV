import type { Cliente } from '~/composables/useClientes'
import type { Producto } from '~/composables/useProductos'
import type { Database, Json } from '~/types/database.types'
import { formatBs, toCents } from '~/utils/money'

export type VentaEstado = 'Completo' | 'Pendiente' | 'No pagado'

export type CarritoItem = {
  productoId: number
  nombre: string
  precioVentaCentavos: number
  precioCostoCentavos: number
  cantidad: number
}

export type VentaRegistradaItem = {
  productoId: number | null
  nombreProducto: string
  cantidad: number
  precioVentaUnitarioCentavos: number
  subtotalCentavos: number
}

export type VentaRegistrada = {
  id: number
  fecha: string
  clienteId: number
  clienteNombre: string
  clienteCelular: string | null
  totalCentavos: number
  gananciaTotalCentavos: number
  pagadoCentavos: number
  estado: VentaEstado
  items: VentaRegistradaItem[]
}

export type ComprobanteSnapshot = Readonly<Omit<VentaRegistrada, 'items'> & {
  items: ReadonlyArray<Readonly<VentaRegistradaItem>>
  montoIngresadoCentavos: number
  cambioCentavos: number
  saldoPendienteCentavos: number
}>

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

function isVentaEstado(value: Json | undefined): value is VentaEstado {
  return value === 'Completo' || value === 'Pendiente' || value === 'No pagado'
}

function parseVentaItem(value: Json): VentaRegistradaItem | null {
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
  if (!Number.isSafeInteger(subtotalCalculado) || subtotalCalculado !== subtotalCentavos) return null

  return {
    productoId,
    nombreProducto: value.nombre_producto,
    cantidad,
    precioVentaUnitarioCentavos,
    subtotalCentavos
  }
}

export function parseVentaRegistrada(value: Json): VentaRegistrada | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null

  const venta = isRecord(value.venta) ? value.venta : value
  const cliente = isRecord(value.cliente) ? value.cliente : venta
  const id = readInteger(venta.id)
  const clienteId = readInteger(venta.cliente_id ?? cliente.id)
  const fecha = venta.fecha ?? value.fecha
  const clienteNombre = venta.cliente_nombre ?? cliente.nombre
  const clienteCelular = venta.cliente_celular ?? cliente.celular ?? null
  const totalCentavos = readMoneyCents(venta.total ?? value.total)
  const gananciaTotalCentavos = readMoneyCents(venta.ganancia_total ?? value.ganancia_total, true)
  const pagadoCentavos = readMoneyCents(venta.pagado ?? value.pagado)
  const estado = venta.estado ?? value.estado
  const items: VentaRegistradaItem[] = []

  for (const rawItem of value.items) {
    const item = parseVentaItem(rawItem)
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
    || pagadoCentavos === null
    || pagadoCentavos > totalCentavos
    || !isVentaEstado(estado)
    || items.length === 0
  ) return null

  const itemsTotalCentavos = items.reduce((total, item) => total + item.subtotalCentavos, 0)
  if (!Number.isSafeInteger(itemsTotalCentavos) || itemsTotalCentavos !== totalCentavos) return null

  if (totalCentavos > 0) {
    const estadoEsperado: VentaEstado = pagadoCentavos === 0
      ? 'No pagado'
      : pagadoCentavos === totalCentavos
        ? 'Completo'
        : 'Pendiente'
    if (estado !== estadoEsperado) return null
  } else if (pagadoCentavos !== 0 || (estado !== 'Completo' && estado !== 'No pagado')) {
    return null
  }

  return {
    id,
    fecha,
    clienteId,
    clienteNombre,
    clienteCelular,
    totalCentavos,
    gananciaTotalCentavos,
    pagadoCentavos,
    estado,
    items
  }
}

function createComprobanteSnapshot(
  venta: VentaRegistrada,
  montoIngresadoCentavos: number
): ComprobanteSnapshot {
  const items = Object.freeze(venta.items.map(item => Object.freeze({ ...item })))

  return Object.freeze({
    ...venta,
    items,
    montoIngresadoCentavos,
    cambioCentavos: Math.max(montoIngresadoCentavos - venta.totalCentavos, 0),
    saldoPendienteCentavos: Math.max(venta.totalCentavos - montoIngresadoCentavos, 0)
  })
}

export function useVentas() {
  const supabase = useSupabaseClient<Database>()
  const clienteSeleccionado = ref<Cliente | null>(null)
  // productoSeleccionado y cantidad se conservan para compatibilidad con el flujo legacy
  const productoSeleccionado = ref<Producto | null>(null)
  const cantidad = ref(1)
  const carrito = ref<CarritoItem[]>([])
  const montoIngresado = ref('')
  const registering = ref(false)
  const error = ref<string | null>(null)
  const ventaRegistrada = ref<VentaRegistrada | null>(null)
  const comprobante = shallowRef<ComprobanteSnapshot | null>(null)

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
  const montoIngresadoCentavos = computed(() => toCents(montoIngresado.value))
  const montoValido = computed(() =>
    montoIngresadoCentavos.value !== null && montoIngresadoCentavos.value >= 0
  )
  const cantidadesValidas = computed(() =>
    carrito.value.every(item => Number.isInteger(item.cantidad) && item.cantidad > 0)
  )
  const cambioCentavos = computed(() =>
    montoValido.value ? Math.max((montoIngresadoCentavos.value ?? 0) - totalCentavos.value, 0) : 0
  )
  const saldoPendienteCentavos = computed(() =>
    montoValido.value ? Math.max(totalCentavos.value - (montoIngresadoCentavos.value ?? 0), 0) : totalCentavos.value
  )
  const estadoPago = computed<VentaEstado>(() => {
    const monto = montoIngresadoCentavos.value ?? 0
    if (monto === 0) return 'No pagado'
    if (monto >= totalCentavos.value) return 'Completo'
    return 'Pendiente'
  })
  const pagoMensaje = computed(() => {
    if (!montoValido.value) return 'Ingresa un monto pagado válido, mayor o igual a cero.'
    if (montoIngresadoCentavos.value === 0) return `Saldo pendiente: ${formatBs(totalCentavos.value)}`
    if (cambioCentavos.value > 0) return `Devolver cambio: ${formatBs(cambioCentavos.value)}`
    if (montoIngresadoCentavos.value === totalCentavos.value) return 'Pago justo exacto'
    return `Saldo pendiente: ${formatBs(saldoPendienteCentavos.value)}`
  })
  const canRegister = computed(() =>
    Boolean(clienteSeleccionado.value)
    && carrito.value.length > 0
    && cantidadesValidas.value
    && montoValido.value
    && !registering.value
    && !ventaRegistrada.value
  )
  const tieneDatosSinGuardar = computed(() =>
    Boolean(
      clienteSeleccionado.value
      || productoSeleccionado.value
      || carrito.value.length
      || montoIngresado.value
      || cantidad.value !== 1
    )
  )

  // Variante original (mantiene compatibilidad con flujo legacy de la página)
  function agregarProducto() {
    const producto = productoSeleccionado.value
    if (!producto || !Number.isInteger(cantidad.value) || cantidad.value < 1) return false

    const existente = carrito.value.find(item => item.productoId === producto.id)
    if (existente) {
      existente.cantidad += cantidad.value
    } else {
      const precioVentaCentavos = toCents(producto.precio_venta)
      const precioCostoCentavos = toCents(producto.precio_costo)
      if (precioVentaCentavos === null || precioCostoCentavos === null) {
        error.value = 'El producto seleccionado tiene precios no válidos.'
        return false
      }
      carrito.value.push({
        productoId: producto.id,
        nombre: producto.nombre,
        precioVentaCentavos,
        precioCostoCentavos,
        cantidad: cantidad.value
      })
    }

    productoSeleccionado.value = null
    cantidad.value = 1
    error.value = null
    return true
  }

  /** Variante usada por ModalAgregarProducto: recibe datos ya resueltos desde el modal */
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
    productoSeleccionado.value = null
    cantidad.value = 1
    carrito.value = []
    montoIngresado.value = ''
    error.value = null
    ventaRegistrada.value = null
    comprobante.value = null
  }

  async function registrarVenta() {
    if (registering.value) return null
    if (ventaRegistrada.value) {
      error.value = 'Esta venta ya fue registrada.'
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
    if (!montoValido.value || montoIngresadoCentavos.value === null) {
      error.value = 'Ingresa un monto pagado válido, mayor o igual a cero.'
      return null
    }

    const montoSnapshot = montoIngresadoCentavos.value
    registering.value = true
    error.value = null

    try {
      const { data, error: requestError } = await supabase.rpc('registrar_venta', {
        p_cliente_id: clienteSeleccionado.value.id,
        p_monto_ingresado: montoSnapshot / 100,
        p_items: carrito.value.map(item => ({
          producto_id: item.productoId,
          cantidad: item.cantidad
        }))
      })

      if (requestError || data === null) throw requestError ?? new Error('La RPC no devolvió datos.')
      const parsed = parseVentaRegistrada(data)
      if (!parsed) throw new Error('La RPC devolvió un formato inesperado.')

      ventaRegistrada.value = parsed
      comprobante.value = createComprobanteSnapshot(parsed, montoSnapshot)
      return parsed
    } catch (cause) {
      console.error('[Ventas] Error al registrar venta', cause)
      error.value = 'No fue posible registrar la venta. Tus datos se conservaron para reintentar.'
      return null
    } finally {
      registering.value = false
    }
  }

  return {
    clienteSeleccionado,
    productoSeleccionado,
    cantidad,
    carrito,
    montoIngresado,
    registering,
    error,
    ventaRegistrada,
    comprobante,
    numeroArticulos,
    totalCentavos,
    gananciaCentavos,
    montoIngresadoCentavos,
    montoValido,
    cantidadesValidas,
    cambioCentavos,
    saldoPendienteCentavos,
    estadoPago,
    pagoMensaje,
    canRegister,
    tieneDatosSinGuardar,
    agregarProducto,
    agregarProductoDirecto,
    actualizarCantidad,
    actualizarPrecioVenta,
    eliminarProducto,
    limpiar,
    registrarVenta
  }
}
