const BOLIVIA_OFFSET_MINUTOS = -4 * 60
const MILISEGUNDOS_POR_MINUTO = 60_000

/**
 * Devuelve el día calendario de Bolivia (YYYY-MM-DD) para un instante ISO/UTC.
 * Bolivia usa UTC-4 todo el año.
 */
export function fechaDiaBolivia(isoUtc: string): string {
  const instante = new Date(isoUtc)
  if (Number.isNaN(instante.getTime())) return isoUtc.split('T')[0] ?? isoUtc

  const fechaBolivia = new Date(
    instante.getTime() + BOLIVIA_OFFSET_MINUTOS * MILISEGUNDOS_POR_MINUTO
  )
  return fechaBolivia.toISOString().slice(0, 10)
}

/** Devuelve el inicio de un día de Bolivia como instante UTC ISO. */
export function inicioDiaBoliviaUtc(diaIso: string): string {
  return new Date(`${diaIso}T00:00:00-04:00`).toISOString()
}

/**
 * Devuelve el inicio del siguiente día de Bolivia como instante UTC ISO.
 * Se utiliza como límite exclusivo de los rangos de fecha.
 */
export function finDiaBoliviaUtc(diaIso: string): string {
  const inicio = new Date(`${diaIso}T00:00:00-04:00`)
  inicio.setUTCDate(inicio.getUTCDate() + 1)
  return inicio.toISOString()
}
