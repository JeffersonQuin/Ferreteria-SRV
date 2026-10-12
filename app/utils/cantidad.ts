const CENTESIMAS_POR_UNIDAD = 100

/** Normaliza una cantidad a un máximo de dos decimales. */
export function normalizarCantidad(cantidad: number): number {
  return Math.round(cantidad * CENTESIMAS_POR_UNIDAD) / CENTESIMAS_POR_UNIDAD
}

/** Valida cantidades finitas, positivas y con un máximo de dos decimales. */
export function esCantidadValida(cantidad: number): boolean {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return false

  const centesimas = cantidad * CENTESIMAS_POR_UNIDAD
  const centesimasRedondeadas = Math.round(centesimas)
  const toleranciaFlotante = Number.EPSILON * Math.max(1, Math.abs(centesimas)) * 4

  return centesimasRedondeadas >= 1
    && Number.isSafeInteger(centesimasRedondeadas)
    && Math.abs(centesimas - centesimasRedondeadas) <= toleranciaFlotante
}
