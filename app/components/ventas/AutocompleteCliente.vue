<script setup lang="ts">
import type { Cliente } from '~/composables/useClientes'

const props = defineProps<{
  clientes: Cliente[]
  modelValue: Cliente | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Cliente | null]
  create: []
}>()

const inputId = useId()
const listId = `${inputId}-listbox`
const createOptionId = `${listId}-create`
const query = ref('')
const open = ref(false)
const activeIndex = ref(-1)
let preserveQueryOnClear = false

const filtered = computed(() => {
  const term = query.value.trim().toLocaleLowerCase('es')
  if (!term) return props.clientes
  return props.clientes.filter(cliente =>
    cliente.nombre.toLocaleLowerCase('es').includes(term)
    || cliente.celular.toLocaleLowerCase('es').includes(term)
  )
})

const activeOptionId = computed(() => {
  if (activeIndex.value < 0) return undefined
  const cliente = filtered.value[activeIndex.value]
  return cliente ? optionId(cliente) : createOptionId
})

watch(() => props.modelValue, (cliente) => {
  if (cliente) {
    preserveQueryOnClear = false
    query.value = `${cliente.nombre} — ${cliente.celular}`
    return
  }

  if (preserveQueryOnClear) {
    preserveQueryOnClear = false
    return
  }

  query.value = ''
}, { immediate: true })

function optionId(cliente: Cliente) {
  return `${listId}-cliente-${cliente.id}`
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  if (props.modelValue) {
    preserveQueryOnClear = true
    emit('update:modelValue', null)
  }
  open.value = true
  activeIndex.value = filtered.value.length ? 0 : filtered.value.length
}

function select(cliente: Cliente) {
  emit('update:modelValue', cliente)
  query.value = `${cliente.nombre} — ${cliente.celular}`
  open.value = false
  activeIndex.value = -1
}

function createNew() {
  open.value = false
  activeIndex.value = -1
  emit('create')
}

function onKeydown(event: KeyboardEvent) {
  const optionCount = filtered.value.length + 1
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    open.value = true
    activeIndex.value = (activeIndex.value + 1 + optionCount) % optionCount
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    activeIndex.value = (activeIndex.value - 1 + optionCount) % optionCount
  } else if (event.key === 'Enter' && open.value && activeIndex.value >= 0) {
    event.preventDefault()
    const cliente = filtered.value[activeIndex.value]
    cliente ? select(cliente) : createNew()
  } else if (event.key === 'Escape') {
    open.value = false
    activeIndex.value = -1
  }
}

function closeLater() {
  window.setTimeout(() => { open.value = false }, 120)
}
</script>

<template>
  <div class="relative">
    <label :for="inputId" class="mb-1.5 block text-sm font-semibold text-gray-700">Cliente</label>
    <input
      :id="inputId"
      :value="query"
      type="text"
      role="combobox"
      autocomplete="off"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-autocomplete="list"
      :aria-activedescendant="activeOptionId"
      placeholder="Buscar por nombre o celular"
      class="w-full rounded-lg border border-[#D4A574] px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
      @input="onInput"
      @focus="open = true"
      @blur="closeLater"
      @keydown="onKeydown"
    >
    <ul
      v-if="open"
      :id="listId"
      role="listbox"
      class="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#D4A574] bg-white py-1 shadow-lg"
    >
      <li
        v-for="(cliente, index) in filtered"
        :id="optionId(cliente)"
        :key="cliente.id"
        role="option"
        :aria-selected="activeIndex === index"
        class="cursor-pointer px-3 py-2 text-sm"
        :class="activeIndex === index ? 'bg-[#F5E6D3] text-[#6B3A2A]' : 'text-gray-700 hover:bg-gray-50'"
        @mousedown.prevent="select(cliente)"
        @mouseenter="activeIndex = index"
      >
        <span class="block font-semibold">{{ cliente.nombre }}</span>
        <span class="block text-xs text-gray-500">{{ cliente.celular }}</span>
      </li>
      <li v-if="!filtered.length" class="px-3 py-2 text-sm text-gray-500">Sin coincidencias</li>
      <li
        :id="createOptionId"
        role="option"
        :aria-selected="activeIndex === filtered.length"
        class="cursor-pointer border-t border-gray-100 px-3 py-2 text-sm font-semibold text-[#6B3A2A]"
        :class="activeIndex === filtered.length ? 'bg-[#F5E6D3]' : 'hover:bg-gray-50'"
        @mousedown.prevent="createNew"
        @mouseenter="activeIndex = filtered.length"
      >
        + Crear nuevo cliente
      </li>
    </ul>
  </div>
</template>
