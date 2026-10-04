<script setup lang="ts">
import type { CotizacionComprobanteSnapshot } from '~/composables/useCotizaciones'
import { formatMonto } from '~/utils/money'

defineProps<{ snapshot: CotizacionComprobanteSnapshot | null }>()

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <section v-if="snapshot" data-print-receipt aria-label="Comprobante de cotización">
    <header class="receipt-header">
      <div class="receipt-header-brand">
        <p class="receipt-brand-name">FERRETERIA SRV</p>
        <p class="receipt-brand-address">Dir. Quintana Esq. Pasaje Municipal</p>
        <p class="receipt-brand-address">Cel. 72344402-72472562</p>
        <p class="receipt-brand-address">Oruro-Bolivia</p>
      </div>
      <h1 class="receipt-title">COTIZACIÓN</h1>
      <p class="receipt-doc-number">N°{{ snapshot.id }}</p>
    </header>

    <dl class="receipt-details">
      <div><dt>Señor(es):</dt><dd>{{ snapshot.clienteNombre }}</dd></div>
      <div><dt>Celular:</dt><dd>{{ snapshot.clienteCelular || 'No registrado' }}</dd></div>
      <div><dt>Fecha:</dt><dd><time :datetime="snapshot.fecha">{{ formatDate(snapshot.fecha) }}</time></dd></div>
    </dl>

    <table class="receipt-table">
      <thead>
        <tr>
          <th scope="col">Cant.</th>
          <th scope="col">Producto</th>
          <th scope="col">Precio Unitario</th>
          <th scope="col">Sub total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in snapshot.items" :key="`${item.productoId}-${index}`">
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
        <div class="receipt-total"><dt>Total Bs:</dt><dd>{{ formatMonto(snapshot.totalCentavos) }}</dd></div>
      </dl>
    </div>
  </section>
</template>
