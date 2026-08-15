<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

export interface AppSelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string
  options?: (string | AppSelectOption)[]
  placeholder?: string
  disabled?: boolean
  variant?: 'default' | 'compact' | 'inline' | 'privacy'
}>(), {
  modelValue: '',
  options: () => [],
  placeholder: '请选择',
  disabled: false,
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const isOpen = ref(false)
const container = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const highlightIndex = ref(-1)
const dropdownStyle = ref<Record<string, string>>({})

const normalizedOptions = computed<AppSelectOption[]>(() =>
  props.options.map(opt =>
    typeof opt === 'string'
      ? { value: opt, label: opt, disabled: false }
      : opt
  )
)

const selectedLabel = computed(() => {
  const opt = normalizedOptions.value.find(o => o.value === props.modelValue)
  return opt ? opt.label : ''
})

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const preferUp = spaceBelow < 200 && rect.top > spaceBelow

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    top: preferUp ? `${rect.top - 4}px` : `${rect.bottom + 4}px`,
    minWidth: `${Math.max(rect.width, 160)}px`,
    maxHeight: '260px',
    transform: preferUp ? 'translateY(-100%)' : 'none',
    transformOrigin: preferUp ? 'bottom center' : 'top center',
  }
}

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    highlightIndex.value = normalizedOptions.value.findIndex(o => o.value === props.modelValue)
    nextTick(updatePosition)
  }
}

function select(opt: AppSelectOption) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  isOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      isOpen.value = true
      highlightIndex.value = 0
      nextTick(updatePosition)
    }
    return
  }
  switch (e.key) {
    case 'Escape':
      isOpen.value = false
      break
    case 'ArrowDown':
      e.preventDefault()
      highlightIndex.value = Math.min(highlightIndex.value + 1, normalizedOptions.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (highlightIndex.value >= 0 && highlightIndex.value < normalizedOptions.value.length) {
        select(normalizedOptions.value[highlightIndex.value])
      }
      break
    case 'Tab':
      isOpen.value = false
      break
  }
}

function handleDocumentClick(e: MouseEvent) {
  if (container.value && !container.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

function handleScroll() {
  if (isOpen.value) updatePosition()
}

watch(highlightIndex, (idx) => {
  if (idx < 0) return
  nextTick(() => {
    const opt = dropdownRef.value?.querySelectorAll('.app-select__option')[idx] as HTMLElement | undefined
    try { opt?.scrollIntoView({ block: 'nearest' }) } catch { /* noop */ }
  })
})

watch(isOpen, (v) => {
  if (v) {
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll, true)
    window.removeEventListener('resize', handleScroll)
  }
})

onMounted(() => document.addEventListener('click', handleDocumentClick))
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
})
</script>

<template>
  <div
    ref="container"
    class="app-select"
    :class="[variant, { open: isOpen, disabled: props.disabled }]"
    @keydown="handleKeydown"
  >
    <button
      ref="triggerRef"
      class="app-select__trigger"
      type="button"
      :disabled="props.disabled"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="app-select__value" :class="{ placeholder: !selectedLabel }">
        {{ selectedLabel || props.placeholder }}
      </span>
      <svg class="app-select__arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="app-select-drop">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="app-select__dropdown"
          :class="variant"
          :style="dropdownStyle"
          role="listbox"
        >
          <div
            v-for="(opt, i) in normalizedOptions"
            :key="opt.value"
            class="app-select__option"
            :class="{
              selected: opt.value === props.modelValue,
              highlighted: i === highlightIndex,
              disabled: opt.disabled
            }"
            role="option"
            :aria-selected="opt.value === props.modelValue"
            @click="select(opt)"
          >
            {{ opt.label }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  display: inline-block;
  outline: none;
}

/* ---------- trigger ---------- */
.app-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  padding: 7px 12px;
  border: 1px solid var(--color-neutral-4, rgba(0, 0, 0, 0.12));
  border-radius: var(--radius-md, 8px);
  background: var(--color-neutral-2, #FAF9F6);
  color: var(--color-neutral-9, #1C1A17);
  font: inherit;
  font-size: var(--text-copy-14, 14px);
  cursor: pointer;
  transition: border-color var(--duration-fast, 150ms) var(--ease-breath),
              box-shadow var(--duration-fast, 150ms) var(--ease-breath),
              background var(--duration-fast, 150ms) var(--ease-breath);
  text-align: left;
  white-space: nowrap;
  user-select: none;
}
.app-select__trigger:hover {
  border-color: var(--color-accent);
}
.app-select.open .app-select__trigger,
.app-select__trigger:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.app-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-select__value.placeholder {
  color: var(--color-neutral-6, #8C8473);
  font-weight: 400;
}

.app-select__arrow {
  flex-shrink: 0;
  transition: transform var(--duration-fast, 150ms) var(--ease-breath);
}
.app-select.open .app-select__arrow {
  transform: rotate(180deg);
}

/* ---------- disabled ---------- */
.app-select.disabled .app-select__trigger {
  opacity: var(--opacity-disabled, 0.45);
  cursor: not-allowed;
}

/* ========== variants ========== */

/* compact — for toolbars */
.app-select.compact .app-select__trigger {
  padding: 4px 10px;
  font-size: var(--text-label-12, 12px);
}

/* inline — for table/card role selects */
.app-select.inline .app-select__trigger {
  padding: 3px 6px;
  font-size: var(--text-copy-13, 13px);
  border-color: transparent;
  background: transparent;
}
.app-select.inline .app-select__trigger:hover {
  border-color: var(--color-neutral-4);
  background: var(--color-neutral-2);
}
.app-select.inline.open .app-select__trigger {
  border-color: var(--color-accent);
  background: var(--color-neutral-2);
}

/* privacy — for privacy grid */
.app-select.privacy .app-select__trigger {
  padding: 4px 8px;
  font-size: var(--text-label-12, 12px);
  min-width: 90px;
}
</style>

<!-- Teleported to body — styles must be non-scoped so they apply to body-level DOM -->
<style>
/* ---------- dropdown panel (teleported to body) ---------- */
.app-select__dropdown {
  z-index: calc(var(--z-modal, 2000) + 1);
  overflow-y: auto;
  background: var(--color-panel-bg, rgba(250, 249, 246, 0.96));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-whisper);
  padding: 4px;
}
.app-select__dropdown::-webkit-scrollbar {
  width: 5px;
}
.app-select__dropdown::-webkit-scrollbar-track {
  background: transparent;
}
.app-select__dropdown::-webkit-scrollbar-thumb {
  background: var(--color-neutral-4, rgba(0, 0, 0, 0.15));
  border-radius: 3px;
}

.app-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  color: var(--color-neutral-9);
  font-size: var(--text-copy-13, 13px);
  transition: background var(--duration-fast, 150ms) var(--ease-breath);
  white-space: nowrap;
  user-select: none;
}
.app-select__option::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.app-select__option:hover,
.app-select__option.highlighted {
  background: var(--color-accent-muted, rgba(37, 99, 235, 0.08));
}
.app-select__option:hover::after,
.app-select__option.highlighted::after {
  opacity: 0.3;
  background: currentColor;
}
.app-select__option.selected {
  font-weight: 600;
  color: var(--color-accent);
}
.app-select__option.selected::after {
  opacity: 1;
  background: var(--color-accent);
  box-shadow: inset 0 0 0 1.5px var(--color-panel-bg);
}
.app-select__option.disabled {
  opacity: var(--opacity-disabled, 0.45);
  cursor: not-allowed;
}

/* variant option density */
.app-select__dropdown.compact .app-select__option,
.app-select__dropdown.privacy .app-select__option {
  padding: 5px 10px;
  font-size: var(--text-label-12, 12px);
}

/* ---------- transition ---------- */
.app-select-drop-enter-active,
.app-select-drop-leave-active {
  transition: opacity var(--duration-fast, 150ms) var(--ease-breath), transform var(--duration-fast, 150ms) var(--ease-breath);
}
.app-select-drop-enter-from,
.app-select-drop-leave-to {
  opacity: 0;
}
.app-select-drop-enter-from {
  transform: translateY(-4px) scale(0.98);
}
.app-select-drop-leave-to {
  transform: translateY(-2px) scale(0.98);
}
</style>
