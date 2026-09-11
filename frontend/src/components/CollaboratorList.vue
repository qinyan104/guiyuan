<script setup lang="ts">
import AppSelect from './AppSelect.vue'
import type { AccessRecord } from '../api/accessManage'

defineProps<{
  records: AccessRecord[]
  loading: boolean
}>()

defineEmits<{
  (event: 'role-change', record: AccessRecord, role: 'EDITOR' | 'VIEWER'): void
  (event: 'profile-change', record: AccessRecord, field: string, value: string): void
  (event: 'remove', record: AccessRecord): void
}>()

const DEFAULT_PROFILE = {
  dates: 'LIVING',
  note: 'LIVING',
  photo: 'LIVING',
}

function avatarLetter(name: string | undefined): string {
  return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'
}

function parseProfile(profileStr?: string) {
  try {
    return profileStr ? JSON.parse(profileStr) : { ...DEFAULT_PROFILE }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}
</script>

<template>
  <section class="list-section">
    <div class="section-header-row">
      <h4 class="section-title">协作者 ({{ records.length }})</h4>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="records.length === 0" class="empty-state">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      <span>暂无协作者，在上方搜索并邀请他人。</span>
    </div>

    <div v-else class="user-list">
      <div v-for="record in records" :key="record.id" class="user-card">
        <div class="user-card-main">
          <div class="user-card-left">
            <span :class="['user-avatar', record.role.toLowerCase()]">
              {{ avatarLetter(record.nickname) }}
            </span>
            <div class="user-meta">
              <span class="user-name">{{ record.nickname }}</span>
              <span class="user-username">@{{ record.username }}</span>
            </div>
          </div>

          <div class="user-card-right">
            <template v-if="record.role === 'OWNER'">
              <span class="role-label owner-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                所有者
              </span>
            </template>
            <template v-else>
              <AppSelect
                variant="inline"
                :modelValue="record.role"
                :options="[{value:'EDITOR',label:'编辑者'},{value:'VIEWER',label:'浏览者'}]"
                @change="(v: string) => $emit('role-change', record, v as 'EDITOR' | 'VIEWER')"
              />
              <button class="btn btn--text btn--danger" title="移除协作者" @click="$emit('remove', record)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            </template>
          </div>
        </div>

        <Transition name="expand">
          <div v-if="record.role === 'VIEWER'" class="privacy-section">
            <div class="privacy-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              隐私脱敏
            </div>
            <div class="privacy-grid">
              <label class="privacy-field">
                <span>生卒日期</span>
                <AppSelect variant="privacy" :modelValue="parseProfile(record.redactionProfile).dates" :options="[{value:'NONE',label:'公开'},{value:'LIVING',label:'隐藏在世'},{value:'ALL',label:'全部隐藏'}]" @change="(v: string) => $emit('profile-change', record, 'dates', v)" />
              </label>
              <label class="privacy-field">
                <span>个人简介</span>
                <AppSelect variant="privacy" :modelValue="parseProfile(record.redactionProfile).note" :options="[{value:'NONE',label:'公开'},{value:'LIVING',label:'隐藏在世'},{value:'ALL',label:'全部隐藏'}]" @change="(v: string) => $emit('profile-change', record, 'note', v)" />
              </label>
              <label class="privacy-field">
                <span>照片</span>
                <AppSelect variant="privacy" :modelValue="parseProfile(record.redactionProfile).photo" :options="[{value:'NONE',label:'公开'},{value:'LIVING',label:'隐藏在世'},{value:'ALL',label:'全部隐藏'}]" @change="(v: string) => $emit('profile-change', record, 'photo', v)" />
              </label>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.section-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--color-neutral-9); }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px 20px; color: var(--color-neutral-6); font-size: 13px; }
.spinner { width: 24px; height: 24px; border: 2px solid var(--color-neutral-3); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.user-list { display: flex; flex-direction: column; gap: 6px; }
.user-card { background: var(--color-neutral-1); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-lg); padding: 14px 18px; transition: all 0.2s ease; }
.user-card:hover { border-color: var(--color-neutral-5); box-shadow: 0 2px 8px rgba(0,0,0,0.04); transform: translateY(-1px); }
.user-card-main { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.user-card-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.user-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; flex-shrink: 0; color: #fff; }
.user-avatar.owner { background: var(--color-accent-gradient); box-shadow: 0 2px 8px rgba(196, 58, 49, 0.1); }
.user-avatar.editor { background: linear-gradient(135deg, #3d6896, #2d5178); box-shadow: 0 2px 8px rgba(61, 104, 150, 0.1); }
.user-avatar.viewer { background: linear-gradient(135deg, #787670, #5c5a55); box-shadow: var(--shadow-whisper); }
.user-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.user-name { font-size: 14px; font-weight: 500; color: var(--color-neutral-9); }
.user-username { font-size: 12px; color: var(--color-neutral-6); }
.user-card-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.role-label { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; }
.owner-badge { background: rgba(196, 58, 49, 0.08); color: var(--color-accent); }
.privacy-section { margin-top: 14px; padding: 14px 16px; background: var(--color-neutral-1); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-md); }
.privacy-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: var(--color-neutral-7); margin-bottom: 12px; }
.privacy-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.privacy-field { display: flex; flex-direction: column; gap: 6px; }
.privacy-field > span { font-size: 11px; font-weight: 500; color: var(--color-neutral-6); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.btn--text { padding: 4px 8px; background: transparent; color: var(--color-neutral-7); }
.btn--text:hover { background: var(--color-neutral-2); color: var(--color-neutral-9); }
.btn--danger { color: var(--color-error); }
.btn--danger:hover { background: var(--color-error-muted); }
@media (max-width: 760px) { .user-card-main, .user-card-right { align-items: flex-start; flex-direction: column; } .privacy-grid { grid-template-columns: 1fr; } }
</style>
