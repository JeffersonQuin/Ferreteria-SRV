<script setup lang="ts">
import type { HistorialCotizacionDetalle } from '~/composables/useHistorialCotizaciones'
import { formatMonto } from '~/utils/money'

defineProps<{
  detalle: HistorialCotizacionDetalle | null
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
      data-print-kind="historical-quote"
      :data-print-active="active ? 'true' : 'false'"
      aria-label="Comprobante histórico de cotización"
    >
      <header class="receipt-header">
        <div class="receipt-header-brand">
          <p class="receipt-brand-name">FERRETERIA SRV</p>
          <p class="receipt-brand-address">Dir. Quintana Esq. Pasaje Municipal</p>
          <p class="receipt-brand-address">Cel. 72344402-72472562</p>
          <p class="receipt-brand-address">Oruro-Bolivia</p>
        </div>
        <h1 class="receipt-title">COTIZACIÓN</h1>
        <p class="receipt-doc-number">N°{{ detalle.cotizacion.id }}</p>
      </header>

      <dl class="receipt-details">
        <div><dt>Señor(es):</dt><dd>{{ detalle.cotizacion.clienteNombre }}</dd></div>
        <div><dt>Celular:</dt><dd>{{ detalle.cotizacion.clienteCelular || 'No registrado' }}</dd></div>
        <div><dt>Fecha:</dt><dd><time :datetime="detalle.cotizacion.fecha">{{ formatDate(detalle.cotizacion.fecha) }}</time></dd></div>
      </dl>

      <table class="receipt-table">
        <thead>
          <tr><th>Cant.</th><th>Producto</th><th>Precio Unitario</th><th>Sub total</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in detalle.items" :key="item.id">
            <td>{{ item.cantidad }}</td>
            <td>{{ item.nombreProducto }}</td>
            <td>{{ formatMonto(item.precioVentaUnitarioCentavos) }}</td>
            <td>{{ formatMonto(item.subtotalCentavos) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="receipt-bottom">
        <p class="receipt-note">Cotización válida por 7 días. No constituye comprobante de pago.</p>
        <dl class="receipt-totals">
          <div class="receipt-total"><dt>Total Bs:</dt><dd>{{ formatMonto(detalle.cotizacion.totalCentavos) }}</dd></div>
        </dl>
      </div>
    </article>
  </Teleport>
</template>
