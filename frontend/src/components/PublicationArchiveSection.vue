<script setup lang="ts">
import type { PublicationSummary } from '../api/publication'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'
import PublicationCard from './PublicationCard.vue'

defineProps<{
  title: string
  publications: PublicationSummary[]
  filteredPublications: PublicationSummary[]
  searchQuery: string
  sortBy: string
  sortOptions: AppSelectOption[]
  openingId: number | null
  deleteConfirmId: number | null
  deletingId: number | null
}>()

defineEmits<{
  (event: 'update:searchQuery', value: string): void
  (event: 'update:sortBy', value: string): void
  (event: 'open', id: number): void
  (event: 'open-book-editor', id: number): void
  (event: 'open-activity', id: number): void
  (event: 'open-stats', id: number): void
  (event: 'edit', publication: PublicationSummary): void
  (event: 'open-collaborators', id: number): void
  (event: 'open-share', id: number): void
  (event: 'request-delete', id: number): void
  (event: 'confirm-delete', id: number): void
  (event: 'cancel-delete'): void
}>()
</script>

<template>
  <section class="gallery-section archive-section">
    <div class="archive-header-row">
      <div class="section-eyebrow">
        <span class="dot-ink"></span> {{ title }}
      </div>

      <div class="list-toolbar">
        <div class="search-box">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            :value="searchQuery"
            type="text"
            placeholder="搜索族谱名称、堂号、郡望祖籍..."
            class="search-input"
            @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          />
          <button v-if="searchQuery" class="clear-search-btn" title="清除搜索" @click="$emit('update:searchQuery', '')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div class="toolbar-controls">
          <div class="sort-select-wrapper">
            <AppSelect :modelValue="sortBy" :options="sortOptions" variant="compact" @update:model-value="$emit('update:sortBy', $event)" />
          </div>
          <div class="count-pill">
            <span v-if="searchQuery">匹配 {{ filteredPublications.length }} / {{ publications.length }} 部</span>
            <span v-else>共收录 {{ publications.length }} 部</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredPublications.length === 0" class="search-empty-state">
      <div class="search-empty-seal">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
      </div>
      <h4 class="search-empty-title">未找到与 “{{ searchQuery }}” 相关的族谱</h4>
      <p class="search-empty-desc">建议更换堂号、祖籍或谱名关键词，或者清除筛选条件</p>
      <button class="btn btn--sm" @click="$emit('update:searchQuery', '')">清除搜索关键词</button>
    </div>

    <div v-else class="archive-grid">
      <PublicationCard
        v-for="pub in filteredPublications"
        :key="pub.id"
        :publication="pub"
        :openingId="openingId"
        :deleteConfirmId="deleteConfirmId"
        :deletingId="deletingId"
        @open="$emit('open', $event)"
        @open-book-editor="$emit('open-book-editor', $event)"
        @open-activity="$emit('open-activity', $event)"
        @open-stats="$emit('open-stats', $event)"
        @edit="$emit('edit', $event)"
        @open-collaborators="$emit('open-collaborators', $event)"
        @open-share="$emit('open-share', $event)"
        @request-delete="$emit('request-delete', $event)"
        @confirm-delete="$emit('confirm-delete', $event)"
        @cancel-delete="$emit('cancel-delete')"
      />
    </div>
  </section>
</template>

<style scoped>
.gallery-section { margin-bottom: 2.5rem; }
.archive-header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 1.25rem; }
.section-eyebrow { display: flex; align-items: center; gap: 8px; font-size: var(--text-label-12, 12px); font-weight: 500; letter-spacing: 0.15em; color: var(--color-neutral-6); text-transform: uppercase; }
.dot-ink { width: 6px; height: 6px; border-radius: 50%; background: var(--color-info); }
.list-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.search-box { position: relative; display: flex; align-items: center; gap: 8px; background: var(--color-panel-bg); border: 1px solid var(--color-card-stroke); border-radius: 999px; padding: 0 14px; height: 36px; min-width: 260px; max-width: 320px; transition: border-color var(--duration-fast) var(--ease-breath), box-shadow var(--duration-fast) var(--ease-breath); }
.search-box:hover { border-color: var(--color-neutral-5); }
.search-box:focus-within { border-color: var(--color-accent); box-shadow: none; }
.search-icon { color: var(--color-neutral-6); flex-shrink: 0; }
.search-input { flex: 1; border: none !important; background: transparent !important; height: 26px; line-height: 26px; padding: 0 4px; font-size: var(--text-copy-14, 14px); color: var(--color-neutral-9); outline: none !important; box-shadow: none !important; letter-spacing: 0.02em; width: 100%; }
.search-input:focus, .search-input:focus-visible { outline: none !important; box-shadow: none !important; border: none !important; }
.search-input::placeholder { color: var(--color-neutral-6); font-weight: 400; }
.clear-search-btn { border: none; background: transparent; color: var(--color-neutral-5); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 2px; border-radius: 50%; transition: color var(--duration-fast); }
.clear-search-btn:hover { color: var(--color-neutral-9); }
.toolbar-controls { display: flex; align-items: center; gap: 10px; }
.sort-select-wrapper { display: flex; align-items: center; }
.sort-select-wrapper :deep(.app-select.compact) { min-width: 110px; }
.sort-select-wrapper :deep(.app-select.compact .app-select__trigger) { height: 36px; border-radius: var(--radius-lg, 12px); background: var(--color-panel-bg); border-color: var(--color-card-stroke); font-size: var(--text-label-12, 12px); padding: 0 12px; box-sizing: border-box; }
.sort-select-wrapper :deep(.app-select.compact .app-select__trigger:hover) { border-color: var(--color-neutral-5); }
.sort-select-wrapper :deep(.app-select.open .app-select__trigger), .sort-select-wrapper :deep(.app-select.compact .app-select__trigger:focus-visible) { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-muted); }
.count-pill { font-size: var(--text-label-12, 12px); color: var(--color-neutral-6); background: var(--color-neutral-2, rgba(0, 0, 0, 0.04)); padding: 0 12px; height: 36px; display: flex; align-items: center; border-radius: var(--radius-lg, 12px); border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06)); }
.search-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; background: var(--color-card-fill); border: 1px dashed var(--color-card-stroke); border-radius: var(--radius-xl, 16px); margin-top: 8px; }
.search-empty-seal { width: 56px; height: 56px; border-radius: 50%; background: var(--color-neutral-2); color: var(--color-neutral-5); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.search-empty-title { font-size: 1.1rem; color: var(--color-neutral-9); margin: 0 0 6px; font-family: var(--font-serif); }
.search-empty-desc { font-size: var(--text-copy-13, 13px); color: var(--color-neutral-6); margin: 0 0 16px; }
.archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 22px; }
@media (max-width: 768px) { .archive-header-row, .list-toolbar { flex-direction: column; align-items: stretch; } .search-box { min-width: 0; max-width: none; width: 100%; } .toolbar-controls { justify-content: space-between; } .archive-grid { grid-template-columns: 1fr; } }
</style>
