<script setup lang="ts">
import type { ComprobanteSnapshot } from '~/composables/useVentas'
import { formatBs } from '~/utils/money'

defineProps<{ snapshot: ComprobanteSnapshot | null }>()

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <section v-if="snapshot" data-print-receipt aria-label="Comprobante de venta">
    <header class="receipt-header">
      <h1>FERRETERÍA SRV</h1>
      <p>Comprobante de venta N.º {{ snapshot.id }}</p>
    </header>

    <dl class="receipt-details">
      <div><dt>Fecha:</dt><dd><time :datetime="snapshot.fecha">{{ formatDate(snapshot.fecha) }}</time></dd></div>
      <div><dt>Cliente:</dt><dd>{{ snapshot.clienteNombre }}</dd></div>
      <div><dt>Celular:</dt><dd>{{ snapshot.clienteCelular || 'No registrado' }}</dd></div>
    </dl>

    <table class="receipt-table">
      <thead>
        <tr>
          <th scope="col">PRODUCTO</th>
          <th scope="col">CANT.</th>
          <th scope="col">P. VENTA</th>
          <th scope="col">SUBTOTAL</th>
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
      <div v-if="snapshot.descuentoCentavos > 0"><dt>Subtotal:</dt><dd>{{ formatBs(snapshot.totalCentavos + snapshot.descuentoCentavos) }}</dd></div>
      <div v-if="snapshot.descuentoCentavos > 0"><dt>Descuento:</dt><dd>- {{ formatBs(snapshot.descuentoCentavos) }}</dd></div>
      <div><dt>Total:</dt><dd>{{ formatBs(snapshot.totalCentavos) }}</dd></div>
      <div><dt>Monto ingresado:</dt><dd>{{ formatBs(snapshot.montoIngresadoCentavos) }}</dd></div>
      <div><dt>Monto aplicado:</dt><dd>{{ formatBs(snapshot.pagadoCentavos) }}</dd></div>
      <div v-if="snapshot.cambioCentavos > 0"><dt>Cambio:</dt><dd>{{ formatBs(snapshot.cambioCentavos) }}</dd></div>
      <div v-else><dt>Saldo pendiente:</dt><dd>{{ formatBs(snapshot.saldoPendienteCentavos) }}</dd></div>
      <div><dt>Estado:</dt><dd>{{ snapshot.estado }}</dd></div>
    </dl>

    <p class="receipt-footer">Gracias por su compra.</p>
  </section>
</template>
