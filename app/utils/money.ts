export function toCents(value: number | string): number | null {
  const normalized = typeof value === 'string' ? value.trim() : value
  if (normalized === '') return null

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) return null

  const roundingOffset = Math.sign(amount) * Number.EPSILON
  const cents = Math.round((amount + roundingOffset) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function formatBs(cents: number): string {
  return `Bs ${fromCents(cents).toFixed(2)}`
}
