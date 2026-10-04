<script setup lang="ts">
import ClienteFormModal from '~/components/clientes/ClienteFormModal.vue'
import type { Cliente, ClientePayload } from '~/composables/useClientes'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Clientes - Ferretería SRV' })

const {
  clientes,
  loading,
  saving,
  deleting,
  error,
  mutationError,
  fetchClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  clearMutationError
} = useClientes()

const searchQuery = ref('')
const formMode = ref<'create' | 'edit' | null>(null)
const selectedCliente = ref<Cliente | null>(null)
const deleteCandidate = ref<Cliente | null>(null)
const successMessage = ref<string | null>(null)
const deleteCancelButton = ref<HTMLButtonElement | null>(null)

const clientesFiltrados = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('es')
  if (!query) return clientes.value

  return clientes.value.filter(cliente =>
    cliente.nombre.toLocaleLowerCase('es').includes(query)
    || cliente.celular.includes(query)
  )
})

const formInitialValues = computed(() => ({
  nombre: selectedCliente.value?.nombre ?? '',
  celular: selectedCliente.value?.celular ?? ''
}))

function resetFeedback() {
  clearMutationError()
}

function openCreateModal() {
  selectedCliente.value = null
  formMode.value = 'create'
  successMessage.value = null
  resetFeedback()
}

function openEditModal(cliente: Cliente) {
  selectedCliente.value = cliente
  formMode.value = 'edit'
  successMessage.value = null
  resetFeedback()
}

function closeFormModal() {
  if (saving.value) return
  formMode.value = null
  selectedCliente.value = null
  resetFeedback()
}

async function submitForm(payload: ClientePayload) {
  if (formMode.value === 'edit' && selectedCliente.value) {
    const updated = await updateCliente(selectedCliente.value.id, payload)
    if (!updated) return

    closeFormModal()
    successMessage.value = `Los datos de ${updated.nombre} se actualizaron correctamente.`
    return
  }

  const created = await createCliente(payload)
  if (!created) return

  closeFormModal()
  successMessage.value = `${created.nombre} fue registrado correctamente.`
}

function openDeleteModal(cliente: Cliente) {
  deleteCandidate.value = cliente
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

  const cliente = deleteCandidate.value
  const deleted = await deleteCliente(cliente.id)
  if (!deleted) return

  closeDeleteModal()
  successMessage.value = `${cliente.nombre} fue eliminado correctamente.`
}

onMounted(fetchClientes)
</script>

<template>
  <section aria-labelledby="clientes-title">
    <VolverDashboard />
    <header class="mb-6">
      <p class="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8B5A3C]">Administración</p>
      <h1 id="clientes-title" class="text-2xl font-bold text-[#6B3A2A] sm:text-3xl">Gestión de Clientes</h1>
      <p class="mt-2 text-sm text-gray-600">Consulta y administra los clientes de Ferretería SRV.</p>
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
        <label for="buscar-clientes" class="sr-only">Buscar clientes por nombre o celular</label>
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg class="h-5 w-5 text-[#8B5A3C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          id="buscar-clientes"
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Buscar por nombre o celular"
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
        Nuevo Cliente
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-[#D4A574] bg-white shadow-sm">
      <div v-if="loading" class="flex min-h-64 flex-col items-center justify-center gap-3 p-8" role="status">
        <svg class="h-9 w-9 animate-spin text-[#6B3A2A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
        </svg>
        <p class="text-sm font-medium text-gray-600">Cargando clientes...</p>
      </div>

      <div v-else-if="error" class="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <svg class="h-10 w-10 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        <div>
          <p class="font-semibold text-gray-800">No pudimos mostrar los clientes</p>
          <p class="mt-1 text-sm text-red-600">{{ error }}</p>
        </div>
        <button type="button" class="rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="fetchClientes">
          Reintentar
        </button>
      </div>

      <div v-else-if="clientesFiltrados.length === 0" class="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <svg class="h-12 w-12 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6m3-3h-6" />
        </svg>
        <div>
          <p class="font-semibold text-gray-800">{{ searchQuery ? 'No se encontraron clientes' : 'Aún no hay clientes registrados' }}</p>
          <p class="mt-1 text-sm text-gray-500">
            {{ searchQuery ? 'Prueba con otro nombre o número de celular.' : 'Registra el primer cliente para comenzar.' }}
          </p>
        </div>
        <button v-if="!searchQuery" type="button" class="mt-1 rounded-lg bg-[#6B3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="openCreateModal">
          Registrar primer cliente
        </button>
      </div>

      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="min-w-full table-fixed divide-y divide-[#D4A574]">
            <thead class="bg-[#6B3A2A] text-left text-sm text-white">
              <tr>
                <th scope="col" class="w-2/5 px-5 py-3 font-semibold">Nombre</th>
                <th scope="col" class="w-1/4 px-5 py-3 font-semibold">Celular</th>
                <th scope="col" class="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="cliente in clientesFiltrados" :key="cliente.id" class="transition-colors hover:bg-[#F5E6D3]/50">
                <td class="break-words px-5 py-4 font-medium text-gray-800">{{ cliente.nombre }}</td>
                <td class="break-words px-5 py-4 text-gray-600">{{ cliente.celular }}</td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="rounded-lg border border-[#D4A574] px-3 py-2 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="openEditModal(cliente)">Editar</button>
                    <button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300" @click="openDeleteModal(cliente)">Eliminar</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-gray-200 md:hidden">
          <article v-for="cliente in clientesFiltrados" :key="cliente.id" class="p-4">
            <h2 class="break-words font-semibold text-gray-800">{{ cliente.nombre }}</h2>
            <p class="mt-1 break-words text-sm text-gray-600">{{ cliente.celular }}</p>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <button type="button" class="rounded-lg border border-[#D4A574] px-3 py-2 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus:ring-2 focus:ring-[#D4A574]" @click="openEditModal(cliente)">Editar</button>
              <button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300" @click="openDeleteModal(cliente)">Eliminar</button>
            </div>
          </article>
        </div>
      </template>
    </div>

    <ClienteFormModal
      :open="formMode !== null"
      :saving="saving"
      :error="mutationError"
      :mode="formMode ?? 'create'"
      :initial-values="formInitialValues"
      @submit="submitForm"
      @close="closeFormModal"
    />

    <div
      v-if="deleteCandidate"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      @click.self="closeDeleteModal"
      @keydown.esc="closeDeleteModal"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" />
          </svg>
        </div>
        <h2 id="delete-title" class="text-xl font-bold text-gray-900">Eliminar cliente</h2>
        <p class="mt-2 text-sm leading-6 text-gray-600">
          ¿Deseas eliminar a <strong class="text-gray-800">{{ deleteCandidate.nombre }}</strong>? Esta acción no se puede deshacer.
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
