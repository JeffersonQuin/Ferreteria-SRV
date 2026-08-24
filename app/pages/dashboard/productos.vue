<script setup lang="ts">
import type { Producto } from '~/composables/useProductos'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Productos - Ferretería SRV' })

const {
  productos,
  loading,
  saving,
  deleting,
  error,
  mutationError,
  fetchProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  clearMutationError
} = useProductos()

const searchQuery = ref('')
const formMode = ref<'create' | 'edit' | null>(null)
const selectedProducto = ref<Producto | null>(null)
const deleteCandidate = ref<Producto | null>(null)
const form = reactive({
  nombre: '',
  descripcion: '',
  precioCosto: '',
  precioVenta: ''
})
const formError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const deleteCancelButton = ref<HTMLButtonElement | null>(null)

const productosFiltrados = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('es')
  if (!query) return productos.value

  return productos.value.filter((producto) => {
    const nombre = producto.nombre.toLocaleLowerCase('es')
    const descripcion = producto.descripcion?.toLocaleLowerCase('es') ?? ''
    return nombre.includes(query) || descripcion.includes(query)
  })
})

const formTitle = computed(() => formMode.value === 'edit' ? 'Editar producto' : 'Nuevo producto')
const submitLabel = computed(() => formMode.value === 'edit' ? 'Guardar cambios' : 'Guardar producto')

function formatCurrency(value: number) {
  const amount = Number(value)
  return `Bs ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`
}

function resetFeedback() {
  formError.value = null
  clearMutationError()
}

function resetForm() {
  form.nombre = ''
  form.descripcion = ''
  form.precioCosto = ''
  form.precioVenta = ''
}

function openCreateModal() {
  selectedProducto.value = null
  resetForm()
  formMode.value = 'create'
  successMessage.value = null
  resetFeedback()
  nextTick(() => nameInput.value?.focus())
}

function openEditModal(producto: Producto) {
  selectedProducto.value = producto
  form.nombre = producto.nombre
  form.descripcion = producto.descripcion ?? ''
  form.precioCosto = Number(producto.precio_costo).toFixed(2)
  form.precioVenta = Number(producto.precio_venta).toFixed(2)
  formMode.value = 'edit'
  successMessage.value = null
  resetFeedback()
  nextTick(() => nameInput.value?.focus())
}

function closeFormModal() {
  if (saving.value) return
  formMode.value = null
  selectedProducto.value = null
  resetFeedback()
}

function getValidatedPayload() {
  const nombre = form.nombre.trim()
  const descripcion = form.descripcion.trim()
  const precioCostoRaw = String(form.precioCosto).trim()
  const precioVentaRaw = String(form.precioVenta).trim()

  if (!nombre) {
    formError.value = 'El nombre del producto es obligatorio.'
    return null
  }

  if (!precioCostoRaw || !precioVentaRaw) {
    formError.value = 'El costo unitario y el precio de venta son obligatorios.'
    return null
  }

  const precioCosto = Number(precioCostoRaw)
  const precioVenta = Number(precioVentaRaw)

  if (!Number.isFinite(precioCosto) || !Number.isFinite(precioVenta)) {
    formError.value = 'Los precios deben ser números válidos.'
    return null
  }

  if (precioCosto < 0 || precioVenta < 0) {
    formError.value = 'Los precios deben ser mayores o iguales a cero.'
    return null
  }

  return {
    nombre,
    descripcion: descripcion || null,
    precio_costo: precioCosto,
    precio_venta: precioVenta
  }
}

async function submitForm() {
  resetFeedback()
  const payload = getValidatedPayload()
  if (!payload) return

  if (formMode.value === 'edit' && selectedProducto.value) {
    const updated = await updateProducto(selectedProducto.value.id, payload)
    if (!updated) return

    closeFormModal()
    successMessage.value = `${updated.nombre} se actualizó correctamente.`
    return
  }

  const created = await createProducto(payload)
  if (!created) return

  closeFormModal()
  successMessage.value = `${created.nombre} fue registrado correctamente.`
}

function openDeleteModal(producto: Producto) {
  deleteCandidate.value = producto
  successMessage.value = null
  resetFeedback()
  nextTick(() => deleteCancelButton.value?.focus())
}

function closeDeleteModal() {
  if (deleting.value) return
  deleteCandidate.value = null
  clearMutationError()
}

async function confirmDelete() {
  if (!deleteCandidate.value) return

  const producto = deleteCandidate.value
  const deleted = await deleteProducto(producto.id)
  if (!deleted) return

  closeDeleteModal()
  successMessage.value = `${producto.nombre} fue eliminado correctamente.`
}

watch(
  () => [form.nombre, form.descripcion, form.precioCosto, form.precioVenta],
  () => {
    formError.value = null
    clearMutationError()
  }
)

onMounted(fetchProductos)
</script>

<template>
  <section aria-labelledby="productos-title">
    <header class="mb-6">
      <p class="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Catálogo</p>
      <h1 id="productos-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Gestión de Productos</h1>
      <p class="mt-2 text-sm text-gray-600">Consulta y administra los productos y precios de Ferretería SRV.</p>
    </header>

    <div
      v-if="successMessage"
      role="status"
      aria-live="polite"
      class="mb-4 flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
    >
      <span>{{ successMessage }}</span>
      <button type="button" class="font-bold text-green-700 hover:text-green-900" aria-label="Cerrar mensaje" @click="successMessage = null">×</button>
    </div>

    <div class="mb-5 flex flex-col gap-3 rounded-xl border border-[#D4A574] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-md">
        <label for="buscar-productos" class="sr-only">Buscar productos por nombre o descripción</label>
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg class="h-5 w-5 text-[#8B5A3C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          id="buscar-productos"
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Buscar por nombre o descripción"
          class="w-full rounded-lg border border-[#D4A574] bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
        >
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:ring-offset-2 sm:w-auto"
        @click="openCreateModal"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nuevo Producto
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-[#D4A574] bg-white shadow-sm">
      <div v-if="loading" class="flex min-h-64 flex-col items-center justify-center gap-3 p-8" role="status">
        <svg class="h-9 w-9 animate-spin text-[#6B3A2A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
        </svg>
        <p class="text-sm font-medium text-gray-600">Cargando productos...</p>
      </div>

      <div v-else-if="error" class="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <svg class="h-10 w-10 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        <div>
          <p class="font-semibold text-gray-800">No pudimos mostrar los productos</p>
          <p class="mt-1 text-sm text-red-600">{{ error }}</p>
        </div>
        <button type="button" class="rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="fetchProductos">
          Reintentar
        </button>
      </div>

      <div v-else-if="productosFiltrados.length === 0" class="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <svg class="h-12 w-12 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
        <div>
          <p class="font-semibold text-gray-800">{{ searchQuery ? 'No se encontraron productos' : 'Aún no hay productos registrados' }}</p>
          <p class="mt-1 text-sm text-gray-500">
            {{ searchQuery ? 'Prueba con otro nombre o descripción.' : 'Registra el primer producto para comenzar.' }}
          </p>
        </div>
        <button v-if="!searchQuery" type="button" class="mt-1 rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="openCreateModal">
          Registrar primer producto
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1080px] table-fixed divide-y divide-[#D4A574]">
          <thead class="bg-[#6B3A2A] text-left text-sm text-white">
            <tr>
              <th scope="col" class="w-[20%] px-5 py-3 font-semibold">Nombre</th>
              <th scope="col" class="w-[30%] px-5 py-3 font-semibold">Descripción</th>
              <th scope="col" class="w-[15%] px-5 py-3 text-right font-semibold">Costo Unitario</th>
              <th scope="col" class="w-[15%] px-5 py-3 text-right font-semibold">Precio Venta</th>
              <th scope="col" class="w-[20%] px-5 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="producto in productosFiltrados" :key="producto.id" class="transition-colors hover:bg-[#F5E6D3]/50">
              <td class="break-words px-5 py-4 font-medium text-gray-800">{{ producto.nombre }}</td>
              <td class="break-words px-5 py-4 text-sm text-gray-600">
                {{ producto.descripcion || 'Sin descripción' }}
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-right font-medium text-gray-700">{{ formatCurrency(producto.precio_costo) }}</td>
              <td class="whitespace-nowrap px-5 py-4 text-right font-semibold text-[#6B3A2A]">{{ formatCurrency(producto.precio_venta) }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button type="button" class="rounded-lg border border-[#D4A574] px-3 py-2 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="openEditModal(producto)">Editar</button>
                  <button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300" @click="openDeleteModal(producto)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="formMode"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="producto-form-title"
      @click.self="closeFormModal"
      @keydown.esc="closeFormModal"
    >
      <div class="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="producto-form-title" class="text-xl font-bold text-[#6B3A2A]">{{ formTitle }}</h2>
            <p class="mt-1 text-sm text-gray-500">Completa los datos y precios del producto.</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4A574]" aria-label="Cerrar diálogo" :disabled="saving" @click="closeFormModal">×</button>
        </div>

        <form class="space-y-4" novalidate @submit.prevent="submitForm">
          <div>
            <label for="producto-nombre" class="mb-1.5 block text-sm font-semibold text-gray-700">Nombre</label>
            <input
              id="producto-nombre"
              ref="nameInput"
              v-model="form.nombre"
              type="text"
              required
              maxlength="150"
              class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              placeholder="Nombre del producto"
            >
          </div>

          <div>
            <label for="producto-descripcion" class="mb-1.5 block text-sm font-semibold text-gray-700">Descripción <span class="font-normal text-gray-500">(opcional)</span></label>
            <textarea
              id="producto-descripcion"
              v-model="form.descripcion"
              rows="3"
              maxlength="500"
              class="w-full resize-y rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              placeholder="Descripción corta del producto"
            />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="producto-costo" class="mb-1.5 block text-sm font-semibold text-gray-700">Costo Unitario</label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
                <input
                  id="producto-costo"
                  v-model="form.precioCosto"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  placeholder="0.00"
                >
              </div>
            </div>

            <div>
              <label for="producto-venta" class="mb-1.5 block text-sm font-semibold text-gray-700">Precio Venta</label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[#8B5A3C]">Bs</span>
                <input
                  id="producto-venta"
                  v-model="form.precioVenta"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  class="w-full rounded-lg border border-[#D4A574] py-2.5 pl-10 pr-3 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  placeholder="0.00"
                >
              </div>
            </div>
          </div>

          <div v-if="formError || mutationError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {{ formError || mutationError }}
          </div>

          <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4A574]" :disabled="saving" @click="closeFormModal">Cancelar</button>
            <button type="submit" class="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-[#6B3A2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:cursor-not-allowed disabled:opacity-60" :disabled="saving">
              <svg v-if="saving" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
              </svg>
              {{ saving ? 'Guardando...' : submitLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="deleteCandidate"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-producto-title"
      @click.self="closeDeleteModal"
      @keydown.esc="closeDeleteModal"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" />
          </svg>
        </div>
        <h2 id="delete-producto-title" class="text-xl font-bold text-gray-900">Eliminar producto</h2>
        <p class="mt-2 text-sm leading-6 text-gray-600">
          ¿Deseas eliminar <strong class="text-gray-800">{{ deleteCandidate.nombre }}</strong>? Esta acción no se puede deshacer.
        </p>

        <div v-if="mutationError" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{{ mutationError }}</div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref="deleteCancelButton" type="button" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4A574]" :disabled="deleting" @click="closeDeleteModal">Cancelar</button>
          <button type="button" class="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60" :disabled="deleting" @click="confirmDelete">
            <svg v-if="deleting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
            </svg>
            {{ deleting ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
