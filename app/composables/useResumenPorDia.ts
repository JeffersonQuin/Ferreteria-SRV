import type { Database, VentaEstado } from '~/types/database.types'
import { toCents } from '~/utils/money'

// ── Tipos para el resumen agrupado por día ──────────────────────────────────

export type ResumenPorDiaItem = {
  fecha: string // Fecha en formato YYYY-MM-DD
  cantidadVentas: number
  cantidadNoPagadas: number
  cantidadPendientes: number
  cantidadCompletadas: number
  totalDiaCentavos: number
  gananciaDiaCentavos: number
}

export type ResumenPorDia = {
  items: ResumenPorDiaItem[]
  generadoEn: string
  totalVentasCentavos: number
  totalGananciasCentavos: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFiniteNumber(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readPositiveInteger(value: unknown) {
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

type VentaParaResumen = {
  fecha: string
  totalCentavos: number
  gananciaTotalCentavos: number
  estado: VentaEstado
}

function parseVentaParaResumen(value: unknown): VentaParaResumen | null {
  if (!isRecord(value)) return null

  const id = readPositiveInteger(value.id)
  const totalCentavos = readMoneyCents(value.total)
  const gananciaTotalCentavos = readMoneyCents(value.ganancia_total, true)

  if (
    id === undefined
    || typeof value.fecha !== 'string'
    || !value.fecha.trim()
    || Number.isNaN(Date.parse(value.fecha))
    || totalCentavos === null
    || gananciaTotalCentavos === null
    || !isVentaEstado(value.estado)
  ) return null

  return {
    fecha: value.fecha,
    totalCentavos,
    gananciaTotalCentavos,
    estado: value.estado
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

// ── Composable ───────────────────────────────────────────────────────────────

export function useResumenPorDia() {
  const supabase = useSupabaseClient<Database>()
  
  const resumenPorDia = shallowRef<ResumenPorDia | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const BATCH_SIZE = 500
  const VENTA_COLUMNS = 'id,fecha,total,ganancia_total,estado'

  async function loadResumenPorDia(): Promise<boolean> {
    if (loading.value) return false
    
    loading.value = true
    error.value = null
    resumenPorDia.value = null

    try {
      // Cargar todas las ventas en lotes
      const collected: VentaParaResumen[] = []
      let offset = 0

      while (true) {
        const { data, error: queryError } = await supabase
          .from('ventas')
          .select(VENTA_COLUMNS)
          .order('fecha', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + BATCH_SIZE - 1)

        if (queryError) throw new Error(queryError.message)

        const parsed = (data ?? []).map(parseVentaParaResumen)
        if (parsed.some(v => v === null)) {
          throw new Error('Supabase devolvió una venta con un formato no válido.')
        }

        collected.push(...parsed as VentaParaResumen[])
        
        if ((data?.length ?? 0) < BATCH_SIZE) break
        offset += BATCH_SIZE
      }

      if (collected.length === 0) {
        throw new Error('No existen ventas para generar el resumen por día.')
      }

      // Agrupar por día (fecha sin hora)
      const porDia = new Map<string, {
        ventas: number
        noPagadas: number
        pendientes: number
        completadas: number
        totalCentavos: number
        gananciaCentavos: number
      }>()

      for (const venta of collected) {
        // Extraer solo la fecha (YYYY-MM-DD) sin la hora
        const fechaDia = venta.fecha.split('T')[0]
        
        const actual = porDia.get(fechaDia) ?? {
          ventas: 0,
          noPagadas: 0,
          pendientes: 0,
          completadas: 0,
          totalCentavos: 0,
          gananciaCentavos: 0
        }

        actual.ventas += 1
        if (venta.estado === 'No pagado') actual.noPagadas += 1
        else if (venta.estado === 'Pendiente') actual.pendientes += 1
        else if (venta.estado === 'Completo') actual.completadas += 1

        actual.totalCentavos = safeAdd(actual.totalCentavos, venta.totalCentavos)
        actual.gananciaCentavos = safeAdd(actual.gananciaCentavos, venta.gananciaTotalCentavos)

        porDia.set(fechaDia, actual)
      }

      // Convertir a array y ordenar por fecha descendente (más recientes primero)
      const items: ResumenPorDiaItem[] = Array.from(porDia.entries())
        .map(([fecha, datos]) => ({
          fecha,
          cantidadVentas: datos.ventas,
          cantidadNoPagadas: datos.noPagadas,
          cantidadPendientes: datos.pendientes,
          cantidadCompletadas: datos.completadas,
          totalDiaCentavos: datos.totalCentavos,
          gananciaDiaCentavos: datos.gananciaCentavos
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)) // Descendente

      // Calcular totales globales
      let totalVentasCentavos = 0
      let totalGananciasCentavos = 0

      for (const item of items) {
        totalVentasCentavos = safeAdd(totalVentasCentavos, item.totalDiaCentavos)
        totalGananciasCentavos = safeAdd(totalGananciasCentavos, item.gananciaDiaCentavos)
      }

      resumenPorDia.value = {
        items,
        generadoEn: new Date().toISOString(),
        totalVentasCentavos,
        totalGananciasCentavos
      }

      return true
    } catch (cause) {
      console.error('[ResumenPorDia] No fue posible cargar el resumen por día', cause)
      error.value = errorMessage(cause, 'No fue posible cargar el resumen por día.')
      resumenPorDia.value = null
      return false
    } finally {
      loading.value = false
    }
  }

  function clearResumenPorDia() {
    resumenPorDia.value = null
    error.value = null
    loading.value = false
  }

  return {
    resumenPorDia,
    loading,
    error,
    loadResumenPorDia,
    clearResumenPorDia
  }
}
