<script setup lang="ts">
import type { ComprobanteSnapshot } from '~/composables/useVentas'
import { formatBs } from '~/utils/money'

defineProps<{ snapshot: ComprobanteSnapshot | null }>()

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <section v-if="snapshot" data-print-receipt aria-label="Comprobante de venta">
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
        <p class="receipt-doc-number">N.º {{ snapshot.id }}</p>
        <p class="receipt-doc-date"><time :datetime="snapshot.fecha">{{ formatDate(snapshot.fecha) }}</time></p>
      </div>
    </header>

    <dl class="receipt-details">
      <div><dt>Cliente</dt><dd>{{ snapshot.clienteNombre }}</dd></div>
      <div><dt>Celular</dt><dd>{{ snapshot.clienteCelular || 'No registrado' }}</dd></div>
    </dl>

    <table class="receipt-table">
      <thead>
        <tr>
          <th scope="col">Producto</th>
          <th scope="col">Cant.</th>
          <th scope="col">P. Venta</th>
          <th scope="col">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in snapshot.items" :key="`${item.productoId}-${index}`">
          <td>{{ item.nombreProducto }}</td>
          <td>{{ item.cantidad }}</td>
          <td>{{ formatBs(item.precioVentaUnitarioCentavos) }}</td>
          <td>{{ formatBs(item.subtotalCentavos) }}</td>
        </tr>
      </tbody>
    </table>

    <dl class="receipt-totals">
      <div v-if="snapshot.descuentoCentavos > 0"><dt>Subtotal</dt><dd>{{ formatBs(snapshot.totalCentavos + snapshot.descuentoCentavos) }}</dd></div>
      <div v-if="snapshot.descuentoCentavos > 0"><dt>Descuento</dt><dd>- {{ formatBs(snapshot.descuentoCentavos) }}</dd></div>
      <div><dt>Total</dt><dd>{{ formatBs(snapshot.totalCentavos) }}</dd></div>
    </dl>
  </section>
</template>
