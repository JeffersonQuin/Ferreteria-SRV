export type CsvCell = string | number | null | undefined

// Excel en configuración regional en español usa ";" como separador de columnas
// y "," como separador decimal.
const SEPARATOR = ';'
const BOM = '\uFEFF'

function formatCell(value: CsvCell) {
  if (value === null || value === undefined) return ''

  let text: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    text = String(value).replace('.', ',')
    return text
  }

  text = value
  // Evita que Excel interprete el texto como fórmula (inyección de fórmulas en CSV).
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`

  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/**
 * Genera el contenido CSV (con BOM UTF-8 para que Excel respete los acentos).
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map(row => row.map(formatCell).join(SEPARATOR))
  return BOM + lines.join('\r\n') + '\r\n'
}

/**
 * Descarga el contenido CSV como archivo desde el navegador.
 */
export function downloadCsv(filename: string, content: string): void {
  if (typeof document === 'undefined') throw new Error('La descarga solo está disponible en el navegador.')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Se revoca tras el click para liberar memoria.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Fecha y hora local legible para columnas de Excel (AAAA-MM-DD HH:MM). */
export function formatCsvDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Fecha de hoy (AAAA-MM-DD) para los nombres de archivo. */
export function todayStamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
