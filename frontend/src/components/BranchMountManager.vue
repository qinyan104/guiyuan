<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'

import { mergeBranch } from '../api/accessManage'
import { getPublication, listPublications, type PublicationSummary } from '../api/publication'
import type { Person } from '../types/family'
import ConfirmDialog from './ConfirmDialog.vue'
import SubtreeRootSelector from './SubtreeRootSelector.vue'

const props = defineProps<{
  person: Person
  publicationId: number | null
}>()

const context = inject('publication-context') as
  | {
      pub: {
        publication: Record<string, unknown>
        settings: Record<string, unknown>
        replaceReactiveObject: <T extends object>(target: T, source: T) => void
        selectedPersonId: { value: string }
        getDefaultSelectedPersonId: (sourcePublication: any) => string
      }
    }
  | undefined

const publications = ref<PublicationSummary[]>([])
const loading = ref(false)
const mergePending = ref(false)
const feedbackMessage = ref('')
const showMergeConfirm = ref(false)
const showRootSelector = ref(false)
const selectedTargetId = ref('')
const isDropdownOpen = ref(false)

const availablePublications = computed(() =>
  publications.value.filter(
    (item) => item.id !== props.publicationId && item.accessRole !== 'VIEWER',
  ),
)

const groupedPublications = computed(() => {
  const groups: Record<string, PublicationSummary[]> = {
    OWNER: [],
    EDITOR: [],
  }
  availablePublications.value.forEach((pub) => {
    if (groups[pub.accessRole]) {
      groups[pub.accessRole].push(pub)
    } else {
      if (!groups['OTHER']) groups['OTHER'] = []
      groups['OTHER'].push(pub)
    }
  })
  return groups
})

const selectedTarget = computed(() =>
  availablePublications.value.find((item) => String(item.id) === selectedTargetId.value) ?? null,
)

function selectPublication(pub: PublicationSummary) {
  selectedTargetId.value = String(pub.id)
  applyTargetPublication(pub)
  isDropdownOpen.value = false
}

function clearSelection() {
  selectedTargetId.value = ''
  applyTargetPublication(null)
  isDropdownOpen.value = false
}

watch(
  () => props.person.mountPointTarget?.publicationId,
  (nextId) => {
    selectedTargetId.value = nextId ? String(nextId) : ''
  },
  { immediate: true },
)

async function loadAccessiblePublications() {
  if (!props.publicationId) return

  loading.value = true
  try {
    publications.value = await listPublications()
  } finally {
    loading.value = false
  }
}

function applyTargetPublication(publication: PublicationSummary | null) {
  if (!publication) {
    props.person.isMountPoint = false
    props.person.mountPointTarget = undefined
    feedbackMessage.value = '已清除挂载目标。'
    return
  }

  props.person.isMountPoint = true
  props.person.mountPointTarget = {
    publicationId: publication.id,
    publicationTitle: publication.title,
    rootPersonId: props.person.mountPointTarget?.rootPersonId,
    rootPersonName: props.person.mountPointTarget?.rootPersonName,
  }
  feedbackMessage.value = `已选择目标族谱：${publication.title}`
}

function handleRootSelected(dbId: number, name: string) {
  if (props.person.mountPointTarget) {
    props.person.mountPointTarget.rootPersonId = dbId
    props.person.mountPointTarget.rootPersonName = name
    feedbackMessage.value = `已设定子树起点：${name}`
  }
}

function clearRootSelection() {
  if (props.person.mountPointTarget) {
    props.person.mountPointTarget.rootPersonId = undefined
    props.person.mountPointTarget.rootPersonName = undefined
    feedbackMessage.value = '已清除子树起点，将全量合并。'
  }
}

function handleToggleMountPoint(enabled: boolean) {
  feedbackMessage.value = ''
  if (!enabled) {
    props.person.isMountPoint = false
    props.person.mountPointTarget = undefined
    selectedTargetId.value = ''
    feedbackMessage.value = '已关闭挂载点。'
    return
  }

  const target = selectedTarget.value ?? availablePublications.value[0] ?? null
  if (!target) {
    alert('当前没有可挂载的其他自有族谱。')
    return
  }

  selectedTargetId.value = String(target.id)
  applyTargetPublication(target)
}

async function refreshPublicationFromServer() {
  if (!props.publicationId || !context) return

  const result = await getPublication(props.publicationId)
  context.pub.replaceReactiveObject(context.pub.publication, result.publication as any)
  context.pub.replaceReactiveObject(context.pub.settings, result.settings as any)
  context.pub.selectedPersonId.value = result.publication.people[props.person.id]
    ? props.person.id
    : context.pub.getDefaultSelectedPersonId(result.publication)
}

async function handleMerge() {
  if (!props.publicationId) {
    alert('请先保存族谱到服务器，再执行物理合并。')
    return
  }
  if (!props.person.isMountPoint || !props.person.mountPointTarget?.publicationId) {
    alert('请先将当前人物设置为有效挂载点。')
    return
  }
  showMergeConfirm.value = true
}

async function executeMerge() {
  if (!props.publicationId || !props.person.isMountPoint || !props.person.mountPointTarget?.publicationId) return

  showMergeConfirm.value = false
  mergePending.value = true
  feedbackMessage.value = ''
  try {
    await mergeBranch(props.publicationId, props.person.id)
    await refreshPublicationFromServer()
    feedbackMessage.value = '物理合并已完成。'
  } catch (error) {
    console.error('branch merge failed', error)
    alert('物理合并失败，请检查权限或稍后重试。')
  } finally {
    mergePending.value = false
  }
}

const closeDropdown = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.custom-select')) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  loadAccessiblePublications()
  window.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown)
})
</script>


<template>
  <section class="branch-mount-panel">
    <div class="branch-mount-panel__header">
      <div>
        <p class="branch-mount-panel__eyebrow">Branch Mount</p>
        <h4>分支挂载与物理合并</h4>
      </div>
      <label class="branch-mount-toggle">
        <input
          :checked="Boolean(person.isMountPoint)"
          type="checkbox"
          @change="handleToggleMountPoint(($event.target as HTMLInputElement).checked)"
        />
        <span>{{ person.isMountPoint ? '已启用' : '未启用' }}</span>
      </label>
    </div>

    <div class="branch-mount-panel__grid">
      <div class="branch-mount-field">
        <span>目标族谱</span>
        <div class="custom-select" :class="{ 'is-open': isDropdownOpen }">
          <button
            class="custom-select__trigger"
            type="button"
            :disabled="loading || !availablePublications.length"
            @click="isDropdownOpen = !isDropdownOpen"
          >
            <span>{{ selectedTarget?.title || '选择一个目标族谱' }}</span>
            <svg
              class="chevron"
              fill="none"
              height="12"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="12"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div v-if="isDropdownOpen" class="custom-select__options">
            <div v-if="groupedPublications.OWNER.length" class="custom-select__group">
              <label>我的族谱</label>
              <button
                v-for="pub in groupedPublications.OWNER"
                :key="pub.id"
                class="custom-select__option"
                @click="selectPublication(pub)"
              >
                {{ pub.title }}
              </button>
            </div>
            <div v-if="groupedPublications.EDITOR.length" class="custom-select__group">
              <label>共享·编辑</label>
              <button
                v-for="pub in groupedPublications.EDITOR"
                :key="pub.id"
                class="custom-select__option"
                @click="selectPublication(pub)"
              >
                {{ pub.title }}
              </button>
            </div>
            <button class="custom-select__option custom-select__option--clear" @click="clearSelection">
              清除选择
            </button>
          </div>
        </div>
        <div v-if="person.isMountPoint && selectedTarget" class="subtree-config">
          <div class="subtree-info">
            <span class="label">子树起点</span>
            <div class="root-display">
              <strong v-if="person.mountPointTarget?.rootPersonName" class="root-name">
                {{ person.mountPointTarget.rootPersonName }}
              </strong>
              <em v-else class="root-none">未指定（全量）</em>
              <button 
                v-if="person.mountPointTarget?.rootPersonName" 
                class="clear-root-btn" 
                title="清除起点"
                @click="clearRootSelection"
              >
                &times;
              </button>
            </div>
          </div>
          <button 
            class="select-root-btn" 
            type="button" 
            @click="showRootSelector = true"
          >
            {{ person.mountPointTarget?.rootPersonName ? '更换起点' : '视觉化指定起点' }}
          </button>
        </div>
      </div>

      <article class="branch-mount-meta">
        <span>当前状态</span>
        <strong>{{ person.isMountPoint ? '挂载点已建立' : '普通人物节点' }}</strong>
        <em>{{ person.mountPointTarget?.publicationTitle || '尚未选择目标族谱' }}</em>
      </article>
    </div>

    <p v-if="feedbackMessage" class="branch-mount-panel__feedback">{{ feedbackMessage }}</p>
  </section>

  <section v-if="person.isMountPoint && selectedTargetId" class="advanced-merge-zone">
    <div class="advanced-merge-zone__header">
      <svg
        fill="none"
        height="18"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="18"
      >
        <path d="M11 17l5 5 5-5M11 7l5-5 5 5M16 22V2M8 2H1.5a.5.5 0 0 0-.5.5v19a.5.5 0 0 0 .5.5H8M4 12h4" />
      </svg>
      <strong>高级合并操作</strong>
    </div>
    <p>
      物理合并会不可逆地将目标族谱“{{ selectedTarget?.title }}”的数据副本直接写入当前稿件。操作完成后，该挂载点将被清除。
    </p>
    <button
      class="relation-btn relation-btn--accent"
      type="button"
      :disabled="mergePending"
      @click="handleMerge"
    >
      {{ mergePending ? '正在物理合并...' : '确认执行物理合并' }}
    </button>
  </section>

    <ConfirmDialog
      :modelValue="showMergeConfirm"
      title="物理合并确认"
      message="物理合并会把目标族谱当前快照复制进当前族谱，并清除这个挂载点。确定继续吗？"
      confirmLabel="确认合并"
      tone="danger"
      @confirm="executeMerge"
      @cancel="showMergeConfirm = false"
      @update:modelValue="(v: boolean) => { if (!v) showMergeConfirm = false }"
    />

    <SubtreeRootSelector
      v-if="showRootSelector"
      v-model="showRootSelector"
      :publication-id="Number(selectedTargetId)"
      :publication-title="selectedTarget?.title"
      @selected="handleRootSelected"
    />
</template>

<style scoped>
.branch-mount-panel {
  border: 1px solid rgba(91, 70, 42, 0.14);
  border-radius: 20px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(255, 248, 236, 0.9), rgba(248, 240, 227, 0.92));
  display: grid;
  gap: 14px;
}

.branch-mount-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.branch-mount-panel__eyebrow {
  margin: 0 0 4px;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.branch-mount-panel__header h4 {
  margin: 0;
  font-size: 1rem;
}

.branch-mount-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-soft);
}

.branch-mount-panel__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 12px;
}

.branch-mount-field,
.branch-mount-meta {
  display: grid;
  gap: 8px;
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(91, 70, 42, 0.08);
}


.branch-mount-field span,
.branch-mount-meta span {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.custom-select {
  position: relative;
  width: 100%;
}

.custom-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(91, 70, 42, 0.14);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
}

.custom-select__trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.custom-select .chevron {
  transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-soft);
}

.custom-select.is-open .chevron {
  transform: rotate(180deg);
}

.custom-select__options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid rgba(91, 70, 42, 0.14);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.custom-select__group label {
  display: block;
  padding: 8px 12px 4px;
  font-size: 0.7rem;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.custom-select__option {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 200ms;
  color: var(--text-main);
}

.custom-select__option:hover {
  background: rgba(169, 110, 53, 0.05);
}

.custom-select__option--clear {
  color: var(--text-soft);
  border-top: 1px solid rgba(91, 70, 42, 0.08);
  margin-top: 4px;
  border-radius: 0 0 8px 8px;
}

.subtree-config {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(91, 70, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtree-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subtree-info .label {
  font-size: 0.72rem;
  color: var(--text-soft);
}

.root-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.root-name {
  font-size: 0.88rem;
  color: #8b4513;
}

.root-none {
  font-size: 0.82rem;
  color: #999;
  font-style: normal;
}

.clear-root-btn {
  background: #eee;
  border: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.select-root-btn {
  width: 100%;
  padding: 6px;
  border: 1px dashed #8b4513;
  background: rgba(139, 69, 19, 0.04);
  color: #8b4513;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.select-root-btn:hover {
  background: rgba(139, 69, 19, 0.08);
}

.branch-mount-meta strong {
  font-size: 0.95rem;
  color: var(--text-main);
}

.branch-mount-meta em {
  font-style: normal;
  font-size: 0.88rem;
  color: var(--text-soft);
}

.branch-mount-panel__feedback {
  margin: 0;
  font-size: 0.86rem;
  color: #2d59a2;
}

.advanced-merge-zone {
  margin-top: 16px;
  padding: 16px;
  background: rgba(217, 119, 6, 0.03);
  border: 1px dashed rgba(217, 119, 6, 0.2);
  border-radius: 16px;
}

.advanced-merge-zone__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #d97706;
}

.advanced-merge-zone__header strong {
  font-size: 0.9rem;
}

.advanced-merge-zone p {
  margin: 0 0 16px;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-soft);
}

@media (max-width: 640px) {
  .branch-mount-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
