<script setup lang="ts">
import type { HistorialVentaDetalle } from '~/composables/useHistorialVentas'
import { formatBs } from '~/utils/money'

defineProps<{
  detalle: HistorialVentaDetalle | null
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
      v-if="detalle"
      data-print-document
      data-print-kind="historical-receipt"
      :data-print-active="active ? 'true' : 'false'"
      aria-label="Comprobante histórico de venta"
    >
      <header class="receipt-header">
        <h1>Ferretería SRV</h1>
        <p>Comprobante de venta N.º {{ detalle.venta.id }}</p>
      </header>

      <dl class="receipt-details">
        <div><dt>Fecha</dt><dd>{{ formatDate(detalle.venta.fecha) }}</dd></div>
        <div><dt>Cliente</dt><dd>{{ detalle.venta.clienteNombre }}</dd></div>
        <div><dt>Celular</dt><dd>{{ detalle.venta.clienteCelular || 'No registrado' }}</dd></div>
      </dl>

      <table class="receipt-table">
        <thead>
          <tr><th>Producto</th><th>Cant.</th><th>P. Venta</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in detalle.items" :key="`${item.ventaId}-${item.productoId ?? item.nombreProducto}`">
            <td>{{ item.nombreProducto }}</td>
            <td>{{ item.cantidad }}</td>
            <td>{{ formatBs(item.precioVentaUnitarioCentavos) }}</td>
            <td>{{ formatBs(item.subtotalCentavos) }}</td>
          </tr>
        </tbody>
      </table>

      <dl class="receipt-totals">
        <div v-if="detalle.venta.descuentoCentavos > 0"><dt>Subtotal</dt><dd>{{ formatBs(detalle.venta.totalCentavos + detalle.venta.descuentoCentavos) }}</dd></div>
        <div v-if="detalle.venta.descuentoCentavos > 0"><dt>Descuento</dt><dd>- {{ formatBs(detalle.venta.descuentoCentavos) }}</dd></div>
        <div><dt>Total</dt><dd>{{ formatBs(detalle.venta.totalCentavos) }}</dd></div>
        <div><dt>Pagado</dt><dd>{{ formatBs(detalle.venta.pagadoCentavos) }}</dd></div>
        <div><dt>Saldo pendiente</dt><dd>{{ formatBs(Math.max(detalle.venta.totalCentavos - detalle.venta.pagadoCentavos, 0)) }}</dd></div>
        <div><dt>Estado</dt><dd>{{ detalle.venta.estado }}</dd></div>
      </dl>

      <p v-if="detalle.tieneInconsistencia" class="receipt-warning">Nota: se muestra el total autoritativo registrado para esta venta.</p>
      <footer class="receipt-footer">Gracias por su compra.</footer>
    </article>
  </Teleport>
</template>
