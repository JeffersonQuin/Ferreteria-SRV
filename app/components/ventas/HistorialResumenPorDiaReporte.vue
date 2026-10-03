<script setup lang="ts">
import type { ResumenPorDia } from '~/composables/useResumenPorDia'
import { formatBs } from '~/utils/money'

defineProps<{
  resumen: ResumenPorDia | null
  active: boolean
}>()

function formatFecha(fecha: string) {
  // Convierte YYYY-MM-DD a DD/MM/YYYY
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <Teleport to="#teleports">
    <article
      v-if="resumen"
      data-print-document
      data-print-kind="sales-daily-summary"
      :data-print-active="active ? 'true' : 'false'"
      aria-label="Informe de ventas agrupado por día"
    >
      <header class="report-header">
        <h1>Ferretería SRV</h1>
        <h2>Informe de ventas por día</h2>
        <p>Generado: {{ formatDateTime(resumen.generadoEn) }}</p>
      </header>

      <table class="report-table report-table-resumen-dia">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Ventas</th>
            <th>No pagadas</th>
            <th>Pendientes</th>
            <th>Completadas</th>
            <th>Total del día</th>
            <th>Ganancia del día</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in resumen.items" :key="item.fecha">
            <td class="col-fecha">{{ formatFecha(item.fecha) }}</td>
            <td class="col-cantidad">{{ item.cantidadVentas }}</td>
            <td class="col-cantidad">{{ item.cantidadNoPagadas }}</td>
            <td class="col-cantidad">{{ item.cantidadPendientes }}</td>
            <td class="col-cantidad">{{ item.cantidadCompletadas }}</td>
            <td class="col-monto">{{ formatBs(item.totalDiaCentavos) }}</td>
            <td class="col-monto">{{ formatBs(item.gananciaDiaCentavos) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="col-label-total">TOTALES GENERALES:</td>
            <td class="col-monto-total">{{ formatBs(resumen.totalVentasCentavos) }}</td>
            <td class="col-monto-total">{{ formatBs(resumen.totalGananciasCentavos) }}</td>
          </tr>
        </tfoot>
      </table>

      <footer class="report-footer">Fin del informe</footer>
    </article>
  </Teleport>
</template>
