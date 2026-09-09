<script setup lang="ts">
import type { CarritoItem } from '~/composables/useVentas'
import { formatBs } from '~/utils/money'

defineProps<{ items: CarritoItem[] }>()

const emit = defineEmits<{
  updateCantidad: [productoId: number, cantidad: number]
  remove: [productoId: number]
  abrirModalProducto: []
}>()

function update(item: CarritoItem, event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (!Number.isInteger(value) || value < 1) {
    input.value = String(item.cantidad)
    return
  }
  emit('updateCantidad', item.productoId, value)
}
</script>

<template>
  <section aria-labelledby="carrito-title" class="overflow-hidden rounded-xl border border-[#D4A574] bg-white shadow-sm">
    <div class="flex items-center justify-between border-b border-[#D4A574] px-4 py-3 sm:px-5">
      <h2 id="carrito-title" class="font-bold text-[#6B3A2A]">Carrito</h2>
      <button
        type="button"
        aria-label="Agregar producto al carrito"
        class="flex h-11 w-11 items-center justify-center rounded-full bg-[#6B3A2A] text-white shadow-sm hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 active:scale-95 transition-transform"
        @click="emit('abrirModalProducto')"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-6 w-6" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </button>
    </div>
    <div v-if="!items.length" class="flex min-h-40 items-center justify-center p-6 text-center text-sm text-gray-500">
      Aún no agregaste productos
    </div>
    <div v-else class="max-w-full overflow-x-auto">
      <table class="min-w-[680px] w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-[#6B3A2A] text-left text-white">
          <tr>
            <th scope="col" class="px-4 py-3 font-semibold">PRODUCTO</th>
            <th scope="col" class="px-4 py-3 text-right font-semibold">P. UNIT</th>
            <th scope="col" class="px-4 py-3 text-center font-semibold">CANT.</th>
            <th scope="col" class="px-4 py-3 text-right font-semibold">SUBT.</th>
            <th scope="col" class="px-4 py-3 text-center font-semibold">ACCIÓN</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="item in items" :key="item.productoId">
            <td class="max-w-56 break-words px-4 py-3 font-medium text-gray-800">{{ item.nombre }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">{{ formatBs(item.precioVentaCentavos) }}</td>
            <td class="px-4 py-3 text-center">
              <label :for="`cantidad-carrito-${item.productoId}`" class="sr-only">Cantidad de {{ item.nombre }}</label>
              <input
                :id="`cantidad-carrito-${item.productoId}`"
                :value="item.cantidad"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                class="w-20 rounded-lg border border-[#D4A574] px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                @change="update(item, $event)"
              >
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#6B3A2A]">
              {{ formatBs(item.precioVentaCentavos * item.cantidad) }}
            </td>
            <td class="px-4 py-3 text-center">
              <button
                type="button"
                class="min-h-10 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                :aria-label="`Eliminar ${item.nombre} del carrito`"
                @click="emit('remove', item.productoId)"
              >
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
