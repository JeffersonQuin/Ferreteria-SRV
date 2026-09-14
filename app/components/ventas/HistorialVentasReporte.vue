<script setup lang="ts">
import type { HistorialReporte } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

defineProps<{
  reporte: HistorialReporte | null
  active: boolean
}>()

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <Teleport to="#teleports">
    <article
      v-if="reporte"
      data-print-document
      data-print-kind="sales-report"
      :data-print-active="active ? 'true' : 'false'"
      aria-label="Reporte general de ventas"
    >
      <header class="report-header">
        <h1>Ferretería SRV</h1>
        <h2>Reporte de ventas</h2>
        <p>Generado: {{ formatDate(reporte.generadoEn) }}</p>
      </header>

      <dl class="report-filters">
        <div><dt>Cliente</dt><dd>{{ reporte.filtroCliente || 'Todos' }}</dd></div>
        <div><dt>Estado</dt><dd>{{ reporte.filtroEstado === 'Todos' ? 'Todos los estados' : reporte.filtroEstado }}</dd></div>
        <div v-if="reporte.filtroFechaDesde || reporte.filtroFechaHasta">
          <dt>Período</dt>
          <dd>
            {{ reporte.filtroFechaDesde || '—' }} / {{ reporte.filtroFechaHasta || '—' }}
          </dd>
        </div>
        <div><dt>Ventas incluidas</dt><dd>{{ reporte.ventas.length }}</dd></div>
      </dl>

      <table class="report-table">
        <thead>
          <tr><th>Fecha</th><th>Cliente</th><th>Total</th><th>Ganancia</th><th>Estado</th></tr>
        </thead>
        <tbody>
          <tr v-for="venta in reporte.ventas" :key="venta.id">
            <td>{{ formatDate(venta.fecha) }}</td>
            <td>{{ venta.clienteNombre }}</td>
            <td>{{ formatBs(venta.totalCentavos) }}</td>
            <td>{{ formatBs(venta.gananciaTotalCentavos) }}</td>
            <td>{{ venta.estado }}</td>
          </tr>
        </tbody>
      </table>

      <dl class="report-totals">
        <div><dt>Total Acumulado de Ventas (Bs)</dt><dd>{{ formatBs(reporte.totalVentasCentavos) }}</dd></div>
        <div><dt>Total Acumulado de Ganancias (Bs)</dt><dd>{{ formatBs(reporte.totalGananciasCentavos) }}</dd></div>
      </dl>

      <footer class="report-footer">Fin del reporte</footer>
    </article>
  </Teleport>
</template>
