<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { searchApi, type PublicationHit, type PersonHit, type SearchResult } from '../api/search'

const router = useRouter()

const query = ref('')
const results = ref<SearchResult>({ publications: [], persons: [] })
const isOpen = ref(false)
const isLoading = ref(false)
const hasSearched = ref(false)

const inputRef = ref<HTMLInputElement | null>(null)
const rootRef = ref<HTMLElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)

  const trimmed = query.value.trim()

  if (!trimmed) {
    results.value = { publications: [], persons: [] }
    hasSearched.value = false
    isLoading.value = false
    return
  }

  isLoading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      results.value = await searchApi(trimmed)
      hasSearched.value = true
      isOpen.value = true
    } catch {
      // searchApi handles errors internally and returns empty results
    } finally {
      isLoading.value = false
    }
  }, 300)
}

watch(query, () => {
  debouncedSearch()
})

function onFocus() {
  if (query.value.trim() && hasSearched.value) {
    isOpen.value = true
  }
}

function onBlur() {
  // Delay closing so that click events on results can fire first
  setTimeout(() => {
    if (!rootRef.value?.contains(document.activeElement)) {
      isOpen.value = false
    }
  }, 200)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}

function onDocumentClick(e: MouseEvent) {
  if (isOpen.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

function navigateToPublication(hit: PublicationHit) {
  isOpen.value = false
  router.push({ name: 'workbench', params: { id: hit.id } })
}

function navigateToPerson(hit: PersonHit) {
  isOpen.value = false
  router.push({
    name: 'workbench',
    params: { id: hit.publicationId },
    query: { personId: hit.personId },
  })
}

const hasResults = computed(() => results.value.publications.length > 0 || results.value.persons.length > 0)

onMounted(() => {
  document.addEventListener('click', onDocumentClick, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, { capture: true })
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div ref="rootRef" class="global-search-root">
    <div class="search-input-wrapper">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        placeholder="输入关键词搜索族谱与人物..."
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <div v-if="isLoading" class="search-spinner"></div>
    </div>

    <transition name="glass-pop">
      <div v-if="isOpen && query.trim()" class="search-dropdown">
        <!-- Loading state -->
        <div v-if="isLoading" class="dropdown-status">
          搜索中...
        </div>

        <!-- No results -->
        <div v-else-if="hasSearched && !hasResults" class="dropdown-status">
          无搜索结果
        </div>

        <!-- Results -->
        <template v-else-if="hasResults">
          <div v-if="results.publications.length > 0" class="result-section">
            <div class="section-header">族谱</div>
            <button
              v-for="hit in results.publications"
              :key="'pub-' + hit.id"
              class="result-item"
              @mousedown.prevent="navigateToPublication(hit)"
            >
              <div class="result-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div class="result-item-content">
                <span class="result-item-title">{{ hit.title }}</span>
                <span v-if="hit.subtitle" class="result-item-subtitle">{{ hit.subtitle }}</span>
              </div>
            </button>
          </div>

          <div v-if="results.persons.length > 0" class="result-section">
            <div class="section-header">人物</div>
            <button
              v-for="hit in results.persons"
              :key="'person-' + hit.personId"
              class="result-item"
              @mousedown.prevent="navigateToPerson(hit)"
            >
              <div class="result-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div class="result-item-content">
                <span class="result-item-title">{{ hit.name }}</span>
                <span class="result-item-context">{{ hit.publicationTitle }}</span>
              </div>
            </button>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.global-search-root {
  position: relative;
  flex: 1;
  max-width: 480px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--glass-pill-bg, rgba(255, 255, 255, 0.5));
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.6));
  border-radius: 999px;
  padding: 0 16px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.search-input-wrapper:focus-within {
  border-color: var(--accent-amber, #a96e35);
  box-shadow: 0 4px 16px rgba(169, 110, 53, 0.15);
  background: var(--glass-bg, rgba(255, 255, 255, 0.4));
}

.search-icon {
  flex-shrink: 0;
  color: var(--text-soft, #888);
  margin-right: 10px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-main, #1a1a1a);
  outline: none;
  letter-spacing: 0.02em;
}

.search-input::placeholder {
  color: var(--text-soft, #888);
  font-weight: 400;
  letter-spacing: 0.02em;
}

/* Spinner for loading state */
.search-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--glass-border-shadow, rgba(255, 255, 255, 0.15));
  border-top-color: var(--accent-amber, #a96e35);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Dropdown ── */
.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 400px;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--glass-border-shadow, rgba(0, 0, 0, 0.05));
  z-index: 9999;
  padding: 8px;
}

.search-dropdown::-webkit-scrollbar {
  width: 6px;
}

.search-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.search-dropdown::-webkit-scrollbar-thumb {
  background: var(--glass-border-shadow, rgba(0, 0, 0, 0.1));
  border-radius: 3px;
}

.search-dropdown::-webkit-scrollbar-thumb:hover {
  background: var(--text-soft, #888);
}

.dropdown-status {
  padding: 24px 16px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-soft, #888);
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* ── Result Sections ── */
.result-section + .result-section {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--glass-border-shadow, rgba(0, 0, 0, 0.05));
}

.section-header {
  padding: 8px 12px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-soft, #888);
  font-family: monospace;
}

/* ── Result Items ── */
.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.result-item:hover {
  background: var(--glass-pill-bg, rgba(0, 0, 0, 0.04));
}

.result-item-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--glass-pill-bg, rgba(255, 255, 255, 0.5));
  color: var(--accent-amber, #a96e35);
}

.result-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-item-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global([data-theme="rosewood"]) .result-item-title,
:global([data-theme="star-sea"]) .result-item-title {
  color: #fff;
}

.result-item-subtitle,
.result-item-context {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-item-context {
  font-weight: 500;
}

/* ── Transition ── */
.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
</style>
