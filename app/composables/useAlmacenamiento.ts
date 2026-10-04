import type { SupabaseClient } from '@supabase/supabase-js'

export type TablaUso = {
  tabla: string
  bytes: number
}

export type UsoAlmacenamiento = {
  totalBytes: number
  limiteBytes: number
  umbralAlertaBytes: number
  tablas: TablaUso[]
  medidoEn: string
}

export type NivelAlmacenamiento = 'ok' | 'alerta' | 'critico'

const BYTES_POR_MB = 1024 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBytes(value: unknown) {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseUso(value: unknown): UsoAlmacenamiento | null {
  if (!isRecord(value) || !Array.isArray(value.tablas)) return null

  const totalBytes = readBytes(value.total_bytes)
  const limiteBytes = readBytes(value.limite_bytes)
  const umbralAlertaBytes = readBytes(value.umbral_alerta_bytes)
  if (
    totalBytes === null
    || limiteBytes === null
    || limiteBytes <= 0
    || umbralAlertaBytes === null
    || typeof value.medido_en !== 'string'
    || Number.isNaN(Date.parse(value.medido_en))
  ) return null

  const tablas: TablaUso[] = []
  for (const raw of value.tablas) {
    if (!isRecord(raw) || typeof raw.tabla !== 'string') return null
    const bytes = readBytes(raw.bytes)
    if (bytes === null) return null
    tablas.push({ tabla: raw.tabla, bytes })
  }

  return { totalBytes, limiteBytes, umbralAlertaBytes, tablas, medidoEn: value.medido_en }
}

export function bytesToMb(bytes: number) {
  return Math.round((bytes / BYTES_POR_MB) * 10) / 10
}

/**
 * Consulta cuánto espacio ocupa la base de datos frente al límite del plan gratuito
 * (500 MB) y avisa cuando se alcanzan los 450 MB.
 * La RPC aún no está en database.types.ts, por eso el cliente se usa sin tipos de esquema.
 */
export function useAlmacenamiento() {
  const supabase = useSupabaseClient() as unknown as SupabaseClient
  const uso = ref<UsoAlmacenamiento | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let requestId = 0

  const usadoMb = computed(() => uso.value ? bytesToMb(uso.value.totalBytes) : 0)
  const limiteMb = computed(() => uso.value ? Math.round(uso.value.limiteBytes / BYTES_POR_MB) : 500)
  const umbralMb = computed(() => uso.value ? Math.round(uso.value.umbralAlertaBytes / BYTES_POR_MB) : 450)
  const porcentaje = computed(() => {
    if (!uso.value) return 0
    return Math.min(100, Math.round((uso.value.totalBytes / uso.value.limiteBytes) * 1000) / 10)
  })
  const enAlerta = computed(() => Boolean(uso.value && uso.value.totalBytes >= uso.value.umbralAlertaBytes))
  const nivel = computed<NivelAlmacenamiento>(() => {
    if (!uso.value) return 'ok'
    if (uso.value.totalBytes >= uso.value.limiteBytes) return 'critico'
    if (uso.value.totalBytes >= uso.value.umbralAlertaBytes) return 'alerta'
    return 'ok'
  })
  const tablasPrincipales = computed(() =>
    (uso.value?.tablas ?? []).filter(tabla => tabla.bytes > 0).slice(0, 6)
  )

  async function cargarUso() {
    const currentRequest = ++requestId
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('obtener_uso_almacenamiento')
      if (rpcError) throw new Error(rpcError.message)

      const parsed = parseUso(data)
      if (!parsed) throw new Error('Supabase devolvió un formato de almacenamiento no válido.')

      if (currentRequest !== requestId) return false
      uso.value = parsed
      return true
    } catch (cause) {
      if (currentRequest !== requestId) return false
      console.error('[Configuracion] No fue posible consultar el almacenamiento', cause)
      error.value = cause instanceof Error && cause.message
        ? cause.message
        : 'No fue posible consultar el almacenamiento.'
      return false
    } finally {
      if (currentRequest === requestId) loading.value = false
    }
  }

  return {
    uso,
    loading,
    error,
    usadoMb,
    limiteMb,
    umbralMb,
    porcentaje,
    enAlerta,
    nivel,
    tablasPrincipales,
    cargarUso
  }
}
