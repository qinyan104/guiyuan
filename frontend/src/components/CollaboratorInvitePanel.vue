<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppSelect from './AppSelect.vue'
import CollaboratorRoleGuide from './CollaboratorRoleGuide.vue'
import type { UserSearchResult } from '../api/accessManage'

defineProps<{
  searchQuery: string
  searchResults: UserSearchResult[]
  selectedUser: UserSearchResult | null
  newRole: 'EDITOR' | 'VIEWER'
  searching: boolean
  adding: boolean
}>()

const emit = defineEmits<{
  (event: 'update:searchQuery', value: string): void
  (event: 'update:newRole', value: 'EDITOR' | 'VIEWER'): void
  (event: 'search-input'): void
  (event: 'select-user', user: UserSearchResult): void
  (event: 'clear-selected-user'): void
  (event: 'close-results'): void
  (event: 'add'): void
}>()

const showRoleGuide = ref(false)
const searchContainer = ref<HTMLElement | null>(null)

function avatarLetter(name: string | undefined): string {
  return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'
}

function handleQueryInput(event: Event) {
  emit('update:searchQuery', (event.target as HTMLInputElement).value)
  emit('search-input')
}

function handleClickOutside(event: MouseEvent) {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    emit('close-results')
  }
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>

<template>
  <section class="invite-section">
    <div class="invite-header">
      <div class="invite-title-row">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
        <span>邀请协作者</span>
      </div>
      <button class="role-guide-toggle" @click="showRoleGuide = !showRoleGuide">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        权限说明
      </button>
    </div>

    <CollaboratorRoleGuide :visible="showRoleGuide" />

    <div ref="searchContainer" class="search-area">
      <div class="search-row">
        <div class="search-wrapper" :class="{ 'has-selected': selectedUser }">
          <template v-if="selectedUser">
            <div class="selected-user-chip">
              <span class="chip-avatar">{{ avatarLetter(selectedUser.nickname) }}</span>
              <span class="chip-name">{{ selectedUser.nickname }}</span>
              <span class="chip-username">@{{ selectedUser.username }}</span>
              <button class="chip-remove" title="取消选择" @click="$emit('clear-selected-user')">&times;</button>
            </div>
          </template>
          <template v-else>
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input :value="searchQuery" type="text" class="search-input" placeholder="搜索用户名或昵称..." @input="handleQueryInput" />
            <div v-if="searching" class="search-spinner-sm"></div>
          </template>
        </div>

        <div class="role-select-group">
          <AppSelect :modelValue="newRole" variant="inline" :options="[{value:'EDITOR',label:'编辑者'},{value:'VIEWER',label:'浏览者'}]" @update:model-value="$emit('update:newRole', $event as 'EDITOR' | 'VIEWER')" />
          <button class="btn btn--primary btn--sm" :disabled="!selectedUser || adding" @click="$emit('add')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {{ adding ? '添加中' : '邀请' }}
          </button>
        </div>

        <Transition name="dropdown">
          <div v-if="searchResults.length > 0 && !selectedUser" class="search-dropdown">
            <div v-for="u in searchResults" :key="u.id" class="search-item" @click="$emit('select-user', u)">
              <span class="search-item-avatar">{{ avatarLetter(u.nickname) }}</span>
              <div class="search-item-detail">
                <span class="search-item-name">{{ u.nickname }}</span>
                <span class="search-item-username">@{{ u.username }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
.invite-section { background: var(--color-panel-bg); border: 1px solid var(--color-card-stroke); border-radius: var(--radius-xl); padding: 18px; box-shadow: var(--shadow-whisper); }
.invite-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.invite-title-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--color-neutral-9); }
.search-area { position: relative; }
.search-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; position: relative; }
.search-wrapper { min-height: 40px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--color-neutral-1); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-lg); transition: border-color 0.2s; }
.search-wrapper:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-muted); }
.search-wrapper.has-selected { border-color: var(--color-accent); background: var(--color-accent-muted); }
.search-input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--color-neutral-9); outline: none; }
.search-input::placeholder { color: var(--color-neutral-5); }
.search-icon { color: var(--color-neutral-5); flex-shrink: 0; }
.search-spinner-sm { width: 16px; height: 16px; border: 2px solid var(--color-neutral-3); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
.selected-user-chip { display: flex; align-items: center; gap: 8px; flex: 1; }
.chip-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; flex-shrink: 0; }
.chip-name { font-size: 14px; font-weight: 500; color: var(--color-neutral-9); }
.chip-username { font-size: 12px; color: var(--color-neutral-6); }
.chip-remove { margin-left: auto; width: 22px; height: 22px; border: none; background: var(--color-neutral-3); color: var(--color-neutral-7); border-radius: 50%; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.chip-remove:hover { background: var(--color-error); color: #fff; }
.role-select-group { display: flex; align-items: center; gap: 8px; }
.search-dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 50; background: var(--color-panel-bg); border: 1px solid var(--color-card-stroke); border-radius: var(--radius-lg); box-shadow: var(--shadow-whisper); overflow: hidden; max-height: 240px; overflow-y: auto; }
.search-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; transition: background 0.15s; }
.search-item:hover { background: var(--color-neutral-1); }
.search-item:not(:last-child) { border-bottom: 1px solid var(--color-neutral-4); }
.search-item-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--color-neutral-3); color: var(--color-neutral-7); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; flex-shrink: 0; }
.search-item-detail { display: flex; flex-direction: column; min-width: 0; }
.search-item-name { font-size: 13px; font-weight: 500; color: var(--color-neutral-9); }
.search-item-username { font-size: 12px; color: var(--color-neutral-5); }
.role-guide-toggle { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border: 1px solid var(--color-neutral-4); border-radius: 999px; background: var(--color-neutral-1); color: var(--color-neutral-6); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.role-guide-toggle:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn--primary { background: var(--color-accent); color: var(--color-text-on-accent); border-color: var(--color-accent); }
.btn--primary:hover { filter: brightness(1.08); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .search-row { grid-template-columns: 1fr; } .role-select-group { justify-content: space-between; } }
</style>
