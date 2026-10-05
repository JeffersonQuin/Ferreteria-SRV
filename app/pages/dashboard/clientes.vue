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

// Solo presentación: inicial para el avatar y número limpio para el enlace de llamada.
function inicial(nombre: string) {
  return nombre.trim().charAt(0).toLocaleUpperCase('es') || '?'
}

function telefono(celular: string) {
  return `tel:${celular.replace(/[^\d+]/g, '')}`
}

onMounted(fetchClientes)
</script>

<template>
  <section aria-labelledby="clientes-title" class="pb-24 sm:pb-0">
    <VolverDashboard
      titulo="Clientes"
      titulo-id="clientes-title"
      descripcion="Consulta y administra los clientes de Ferretería SRV."
      tono="terracota"
    >
      <template #icon>
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6m3-3h-6" />
        </svg>
      </template>
    </VolverDashboard>

    <div
      v-if="successMessage"
      role="status"
      aria-live="polite"
      class="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"
    >
      <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" />
      </svg>
      <span class="flex-1">{{ successMessage }}</span>
      <button type="button" class="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-green-800 hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500" aria-label="Cerrar mensaje" @click="successMessage = null">×</button>
    </div>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:max-w-md">
        <label for="buscar-clientes" class="sr-only">Buscar clientes por nombre o celular</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg class="h-5 w-5 text-[#A9784A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            id="buscar-clientes"
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            enterkeyhint="search"
            placeholder="Buscar por nombre o celular"
            class="min-h-12 w-full rounded-2xl border border-[#D4A574] bg-white py-3 pl-11 pr-4 text-base text-gray-900 shadow-sm placeholder-gray-500 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] sm:text-sm"
          >
        </div>
        <p v-if="!loading && !error" class="mt-2 pl-1 text-sm text-[#5C4033]" aria-live="polite">
          {{ clientesFiltrados.length }} {{ clientesFiltrados.length === 1 ? 'cliente' : 'clientes' }}
        </p>
      </div>

      <!-- En celular flota abajo a la derecha, al alcance del pulgar -->
      <button
        type="button"
        class="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#C2603F] to-[#9A4330] px-6 text-base font-semibold text-white shadow-[0_14px_24px_-8px_rgba(74,36,24,0.75)] transition-all duration-200 hover:from-[#CF6B49] hover:to-[#A84A36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2418] focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 sm:static sm:min-h-12 sm:rounded-2xl sm:px-5 sm:text-sm sm:shadow-md"
        @click="openCreateModal"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nuevo Cliente
      </button>
    </div>

    <div class="overflow-hidden rounded-3xl border border-[#E3CFB4] bg-white shadow-[0_1px_2px_rgba(74,36,24,0.08),0_12px_24px_-14px_rgba(74,36,24,0.35)]">
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
          <p class="mt-1 text-sm text-red-700">{{ error }}</p>
        </div>
        <button type="button" class="min-h-11 rounded-xl bg-[#6B3A2A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]" @click="fetchClientes">
          Reintentar
        </button>
      </div>

      <div v-else-if="clientesFiltrados.length === 0" class="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E6D3] text-[#9A4330]">
          <svg class="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6m3-3h-6" />
          </svg>
        </span>
        <div>
          <p class="font-semibold text-gray-800">{{ searchQuery ? 'No se encontraron clientes' : 'Aún no hay clientes registrados' }}</p>
          <p class="mt-1 text-sm text-gray-600">
            {{ searchQuery ? 'Prueba con otro nombre o número de celular.' : 'Registra el primer cliente para comenzar.' }}
          </p>
        </div>
        <button v-if="!searchQuery" type="button" class="mt-1 min-h-11 rounded-xl bg-[#6B3A2A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#8B5A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]" @click="openCreateModal">
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
                    <button type="button" class="min-h-10 rounded-lg border border-[#D4A574] px-3 py-2 text-sm font-semibold text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]" @click="openEditModal(cliente)">Editar</button>
                    <button type="button" class="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300" @click="openDeleteModal(cliente)">Eliminar</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="divide-y divide-[#F0E2CE] md:hidden">
          <li v-for="cliente in clientesFiltrados" :key="cliente.id" class="flex items-center gap-3 p-4">
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C2603F] to-[#9A4330] text-lg font-bold text-white"
              aria-hidden="true"
            >{{ inicial(cliente.nombre) }}</span>

            <div class="min-w-0 flex-1">
              <h2 class="break-words font-semibold leading-tight text-[#3A1C12]">{{ cliente.nombre }}</h2>
              <a
                :href="telefono(cliente.celular)"
                class="mt-1 inline-flex min-h-8 items-center gap-1.5 break-all text-sm font-medium text-[#9A4330] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]"
                :aria-label="`Llamar a ${cliente.nombre} al ${cliente.celular}`"
              >
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
                </svg>
                {{ cliente.celular }}
              </a>
            </div>

            <div class="flex shrink-0 gap-1.5">
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4A574] text-[#6B3A2A] hover:bg-[#F5E6D3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] active:scale-95"
                :aria-label="`Editar a ${cliente.nombre}`"
                @click="openEditModal(cliente)"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-95"
                :aria-label="`Eliminar a ${cliente.nombre}`"
                @click="openDeleteModal(cliente)"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" />
                </svg>
              </button>
            </div>
          </li>
        </ul>
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
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      @click.self="closeDeleteModal"
      @keydown.esc="closeDeleteModal"
    >
      <div class="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:pb-6">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18m-2 0-.7 14H5.7L5 6m3 0V4h8v2m-6 4v6m4-6v6" />
          </svg>
        </div>
        <h2 id="delete-title" class="text-xl font-bold text-gray-900">Eliminar cliente</h2>
        <p class="mt-2 text-sm leading-6 text-gray-600">
          ¿Deseas eliminar a <strong class="text-gray-800">{{ deleteCandidate.nombre }}</strong>? Esta acción no se puede deshacer.
        </p>

        <div v-if="mutationError" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ mutationError }}</div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref="deleteCancelButton" type="button" class="min-h-12 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574]" :disabled="deleting" @click="closeDeleteModal">Cancelar</button>
          <button type="button" class="inline-flex min-h-12 min-w-32 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60" :disabled="deleting" @click="confirmDelete">
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
