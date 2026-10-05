<script setup lang="ts">
import type { Producto } from '~/composables/useProductos'
import { formatBs, toCents } from '~/utils/money'

const props = withDefaults(defineProps<{
  productos: Producto[]
  modelValue: Producto | null
  disabled?: boolean
  hideCreate?: boolean
}>(), {
  disabled: false,
  hideCreate: false
})

const emit = defineEmits<{
  'update:modelValue': [value: Producto | null]
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
  if (!term) return props.productos
  return props.productos.filter(producto =>
    producto.nombre.toLocaleLowerCase('es').includes(term)
    || (producto.descripcion ?? '').toLocaleLowerCase('es').includes(term)
  )
})

const activeOptionId = computed(() => {
  if (activeIndex.value < 0) return undefined
  const producto = filtered.value[activeIndex.value]
  return producto ? optionId(producto) : createOptionId
})

watch(() => props.modelValue, (producto) => {
  if (producto) {
    preserveQueryOnClear = false
    query.value = producto.nombre
    return
  }

  if (preserveQueryOnClear) {
    preserveQueryOnClear = false
    return
  }

  query.value = ''
}, { immediate: true })

function optionId(producto: Producto) {
  return `${listId}-producto-${producto.id}`
}

function formattedPrice(producto: Producto) {
  return formatBs(toCents(producto.precio_venta) ?? 0)
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

function select(producto: Producto) {
  emit('update:modelValue', producto)
  query.value = producto.nombre
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
    const producto = filtered.value[activeIndex.value]
    producto ? select(producto) : createNew()
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
    <label :for="inputId" class="mb-1.5 block text-sm font-semibold text-[#4A2418]">Producto</label>
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        <svg class="h-5 w-5 text-[#A9784A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        :id="inputId"
        :value="query"
        type="text"
        role="combobox"
        autocomplete="off"
        enterkeyhint="search"
        :disabled="disabled"
        :aria-expanded="open"
        :aria-controls="listId"
        aria-autocomplete="list"
        :aria-activedescendant="activeOptionId"
        placeholder="Buscar por nombre o descripción"
        class="min-h-[3.25rem] w-full rounded-xl border border-[#A9784A] bg-white py-3 pl-11 pr-4 text-base text-gray-900 placeholder-gray-500 transition-colors duration-200 focus:border-[#6B3A2A] focus:outline-none focus:ring-2 focus:ring-[#D4A574] disabled:bg-gray-100"
        @input="onInput"
        @focus="open = true"
        @blur="closeLater"
        @keydown="onKeydown"
      >
    </div>
    <ul
      v-if="open"
      :id="listId"
      role="listbox"
      class="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#E3CFB4] bg-white py-1 shadow-[0_18px_32px_-12px_rgba(74,36,24,0.45)]"
    >
      <li
        v-for="(producto, index) in filtered"
        :id="optionId(producto)"
        :key="producto.id"
        role="option"
        :aria-selected="activeIndex === index"
        class="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2.5"
        :class="activeIndex === index ? 'bg-[#F5E6D3] text-[#4A2418]' : 'text-gray-800 hover:bg-gray-50'"
        @mousedown.prevent="select(producto)"
        @mouseenter="activeIndex = index"
      >
        <span class="min-w-0">
          <span class="block truncate font-semibold leading-tight">{{ producto.nombre }}</span>
          <span v-if="producto.descripcion" class="mt-0.5 block truncate text-sm text-[#5C4033]">{{ producto.descripcion }}</span>
        </span>
        <span class="shrink-0 rounded-lg bg-[#FBE6BE] px-2 py-1 text-sm font-bold text-[#4A2418]">{{ formattedPrice(producto) }}</span>
      </li>
      <li v-if="!filtered.length" class="px-4 py-3 text-sm text-[#5C4033]">Sin coincidencias</li>
      <li
        :id="createOptionId"
        role="option"
        :aria-selected="activeIndex === filtered.length"
        class="flex min-h-12 cursor-pointer items-center gap-2 border-t border-[#F0E2CE] px-4 py-2.5 font-semibold text-[#6B3A2A]"
        :class="activeIndex === filtered.length ? 'bg-[#F5E6D3]' : 'hover:bg-gray-50'"
        @mousedown.prevent="createNew"
        @mouseenter="activeIndex = filtered.length"
      >
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#6B3A2A] text-white" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
        </span>
        Crear nuevo producto
      </li>
    </ul>
  </div>
</template>
