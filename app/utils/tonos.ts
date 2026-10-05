// Colores por módulo. Se comparten entre las tarjetas del dashboard (AppCard)
// y la cabecera de cada pantalla (VolverDashboard) para que el usuario reconozca
// de un vistazo en qué aplicación está.
// Las clases van completas y estáticas para que Tailwind las detecte.
export type Tono = 'arena' | 'terracota' | 'ocre' | 'oliva' | 'petroleo' | 'ciruela' | 'pizarra'

export const iconoPorTono: Record<Tono, string> = {
  arena: 'bg-gradient-to-br from-[#6B3A2A] to-[#3A1C12]',
  terracota: 'bg-gradient-to-br from-[#C2603F] to-[#9A4330]',
  ocre: 'bg-gradient-to-br from-[#B07A1E] to-[#8A5E12]',
  oliva: 'bg-gradient-to-br from-[#6B7A3A] to-[#505E26]',
  petroleo: 'bg-gradient-to-br from-[#2F7079] to-[#22555C]',
  ciruela: 'bg-gradient-to-br from-[#86446A] to-[#653050]',
  pizarra: 'bg-gradient-to-br from-[#56636F] to-[#3E4852]'
}
