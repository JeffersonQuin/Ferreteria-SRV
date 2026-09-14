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
        <!-- Columna izquierda: identidad del negocio -->
        <div class="receipt-header-brand">
          <img src="/Logo.png" alt="Logo Ferretería SRV" class="receipt-logo" />
          <div class="receipt-brand-text">
            <p class="receipt-brand-name">FERRETERIA SRV</p>
            <p class="receipt-brand-address">Dir: Quintana Esq. Pasaje Municipal, Cel: 72344402-72472562, Oruro-Bolivia</p>
          </div>
        </div>
        <!-- Columna derecha: identificación del documento -->
        <div class="receipt-header-doc">
          <h1 class="receipt-title">RECIBO</h1>
          <p class="receipt-doc-number">N.º {{ detalle.venta.id }}</p>
          <p class="receipt-doc-date"><time :datetime="detalle.venta.fecha">{{ formatDate(detalle.venta.fecha) }}</time></p>
        </div>
      </header>

      <dl class="receipt-details">
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
      </dl>

      <p v-if="detalle.tieneInconsistencia" class="receipt-warning">Nota: se muestra el total autoritativo registrado para esta venta.</p>
    </article>
  </Teleport>
</template>
