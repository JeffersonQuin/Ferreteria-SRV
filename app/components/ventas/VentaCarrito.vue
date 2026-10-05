<script setup lang="ts">
import type { CarritoItem } from '~/composables/useVentas'
import { formatBs, toCents } from '~/utils/money'

defineProps<{ items: CarritoItem[] }>()

const emit = defineEmits<{
  updateCantidad: [productoId: number, cantidad: number]
  updatePrecio: [productoId: number, precioCentavos: number]
  remove: [productoId: number]
  abrirModalProducto: []
}>()

function updateCantidad(item: CarritoItem, event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (!Number.isInteger(value) || value < 1) {
    input.value = String(item.cantidad)
    return
  }
  emit('updateCantidad', item.productoId, value)
}

function updatePrecio(item: CarritoItem, event: Event) {
  const input = event.target as HTMLInputElement
  const centavos = toCents(input.value)
  if (centavos === null || centavos <= 0) {
    // revertir al valor anterior formateado sin símbolo para el input
    input.value = (item.precioVentaCentavos / 100).toFixed(2)
    return
  }
  emit('updatePrecio', item.productoId, centavos)
}
</script>

<template>
  <section aria-labelledby="carrito-title" class="overflow-hidden rounded-3xl border border-[#E3CFB4] bg-white shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
    <div class="flex items-center justify-between gap-3 border-b border-[#F0E2CE] px-4 py-3 sm:px-5">
      <h2 id="carrito-title" class="flex items-center gap-2 text-lg font-bold text-[#3A1C12]">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6D3] text-[#6B3A2A]" aria-hidden="true">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
        </span>
        Carrito
        <span v-if="items.length" class="rounded-full bg-[#F5E6D3] px-2 py-0.5 text-xs font-bold text-[#4A2418]">{{ items.length }}</span>
      </h2>
      <button
        type="button"
        aria-label="Agregar producto al carrito"
        class="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-br from-[#6B3A2A] to-[#4A2418] pl-3.5 pr-4 text-sm font-semibold text-white shadow-md transition-transform hover:from-[#7A4634] hover:to-[#5A2F21] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        @click="emit('abrirModalProducto')"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Agregar
      </button>
    </div>

    <div v-if="!items.length" class="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E6D3] text-[#6B3A2A]" aria-hidden="true">
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
      </span>
      <p class="font-semibold text-[#3A1C12]">Aún no agregaste productos</p>
      <p class="text-sm text-[#5C4033]">Toca "Agregar" para añadir el primero.</p>
    </div>

    <template v-else>
      <!-- Celular y tablet: una tarjeta por producto -->
      <ul class="divide-y divide-[#F0E2CE] md:hidden">
        <li v-for="item in items" :key="item.productoId" class="p-4">
          <div class="flex items-start justify-between gap-3">
            <h3 class="min-w-0 break-words font-semibold leading-tight text-[#3A1C12]">{{ item.nombre }}</h3>
            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-95"
              :aria-label="`Eliminar ${item.nombre} del carrito`"
              @click="emit('remove', item.productoId)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" />
              </svg>
            </button>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label :for="`cantidad-carrito-m-${item.productoId}`" class="mb-1 block text-sm font-medium text-[#4A2418]">Cantidad</label>
              <input
                :id="`cantidad-carrito-m-${item.productoId}`"
                :value="item.cantidad"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-2 text-center text-base text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                @change="updateCantidad(item, $event)"
              >
            </div>
            <div>
              <label :for="`precio-carrito-m-${item.productoId}`" class="mb-1 block text-sm font-medium text-[#4A2418]">Precio venta (Bs)</label>
              <input
                :id="`precio-carrito-m-${item.productoId}`"
                :value="(item.precioVentaCentavos / 100).toFixed(2)"
                type="number"
                min="0.01"
                step="0.01"
                inputmode="decimal"
                class="min-h-12 w-full rounded-xl border border-[#A9784A] bg-white px-2 text-center text-base text-gray-900 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                @change="updatePrecio(item, $event)"
              >
            </div>
          </div>

          <p class="mt-3 flex items-center justify-between rounded-xl bg-[#FBE6BE] px-3 py-2 text-sm">
            <span class="font-medium text-[#4A2418]">Subtotal</span>
            <strong class="text-base text-[#4A2418]">{{ formatBs(item.precioVentaCentavos * item.cantidad) }}</strong>
          </p>
        </li>
      </ul>

      <!-- Pantallas medianas y grandes: tabla -->
      <div class="hidden max-w-full overflow-x-auto md:block">
        <table class="w-full min-w-[720px] divide-y divide-gray-200 text-sm">
          <thead class="bg-[#6B3A2A] text-left text-white">
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">PRODUCTO</th>
              <th scope="col" class="px-4 py-3 text-center font-semibold">CANT.</th>
              <th scope="col" class="px-4 py-3 text-center font-semibold">P. VENTA</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold">SUBT.</th>
              <th scope="col" class="px-4 py-3 text-center font-semibold">ACCIÓN</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in items" :key="item.productoId">
              <td class="max-w-56 break-words px-4 py-3 font-medium text-gray-800">
                {{ item.nombre }}
              </td>

              <td class="px-4 py-3 text-center">
                <label :for="`cantidad-carrito-${item.productoId}`" class="sr-only">
                  Cantidad de {{ item.nombre }}
                </label>
                <input
                  :id="`cantidad-carrito-${item.productoId}`"
                  :value="item.cantidad"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  class="w-20 rounded-lg border border-[#D4A574] px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  @change="updateCantidad(item, $event)"
                >
              </td>

              <td class="px-4 py-3 text-center">
                <label :for="`precio-carrito-${item.productoId}`" class="sr-only">
                  Precio de venta de {{ item.nombre }}
                </label>
                <input
                  :id="`precio-carrito-${item.productoId}`"
                  :value="(item.precioVentaCentavos / 100).toFixed(2)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputmode="decimal"
                  class="w-24 rounded-lg border border-[#D4A574] px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  @change="updatePrecio(item, $event)"
                >
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#6B3A2A]">
                {{ formatBs(item.precioVentaCentavos * item.cantidad) }}
              </td>

              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="min-h-10 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
    </template>
  </section>
</template>
