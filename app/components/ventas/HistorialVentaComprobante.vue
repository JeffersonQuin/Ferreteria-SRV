<script setup lang="ts">
import type { HistorialVentaDetalle } from '~/composables/useHistorialVentas'
import { formatMonto } from '~/utils/money'

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
        <!-- Izquierda: identidad del negocio -->
        <div class="receipt-header-brand">
          <p class="receipt-brand-name">FERRETERIA SRV</p>
          <p class="receipt-brand-address">Dir. Quintana Esq. Pasaje Municipal</p>
          <p class="receipt-brand-address">Cel. 72344402-72472562</p>
          <p class="receipt-brand-address">Oruro-Bolivia</p>
        </div>
        <!-- Centro: título -->
        <h1 class="receipt-title">RECIBO</h1>
        <!-- Derecha: número de recibo -->
        <p class="receipt-doc-number">N°{{ detalle.venta.id }}</p>
      </header>

      <dl class="receipt-details">
        <div><dt>Señor(es):</dt><dd>{{ detalle.venta.clienteNombre }}</dd></div>
        <div><dt>Celular:</dt><dd>{{ detalle.venta.clienteCelular || 'No registrado' }}</dd></div>
        <div><dt>Fecha:</dt><dd><time :datetime="detalle.venta.fecha">{{ formatDate(detalle.venta.fecha) }}</time></dd></div>
      </dl>

      <table class="receipt-table">
        <thead>
          <tr><th>Cant.</th><th>Producto</th><th>Precio Unitario</th><th>Sub total</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in detalle.items" :key="`${item.ventaId}-${item.productoId ?? item.nombreProducto}`">
            <td>{{ item.cantidad }}</td>
            <td>{{ item.nombreProducto }}</td>
            <td>{{ formatMonto(item.precioVentaUnitarioCentavos) }}</td>
            <td>{{ formatMonto(item.subtotalCentavos) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="receipt-bottom">
        <p class="receipt-note">Este recibo no es válido para crédito fiscal.</p>
        <dl class="receipt-totals">
          <div v-if="detalle.venta.descuentoCentavos > 0"><dt>Subtotal Bs:</dt><dd>{{ formatMonto(detalle.venta.totalCentavos + detalle.venta.descuentoCentavos) }}</dd></div>
          <div v-if="detalle.venta.descuentoCentavos > 0"><dt>Descuento Bs:</dt><dd>{{ formatMonto(detalle.venta.descuentoCentavos) }}</dd></div>
          <div class="receipt-total"><dt>Total Bs:</dt><dd>{{ formatMonto(detalle.venta.totalCentavos) }}</dd></div>
        </dl>
      </div>
    </article>
  </Teleport>
</template>
