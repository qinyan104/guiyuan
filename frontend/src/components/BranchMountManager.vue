<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'

const feedback = useFeedback()
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'

import { mergeBranch } from '../api/accessManage'
import { getPublication, listPublications, type PublicationSummary } from '../api/publication'
import { PUBLICATION_CONTEXT_KEY, type MountPointTarget, type Person } from '../types/family'
import ConfirmDialog from './ConfirmDialog.vue'
import SubtreeRootSelector from './SubtreeRootSelector.vue'

const props = defineProps<{
  person: Person
  publicationId: number | null
}>()

const context = inject(PUBLICATION_CONTEXT_KEY) as
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
      if (!groups.OTHER) groups.OTHER = []
      groups.OTHER.push(pub)
    }
  })
  return groups
})

const selectedTarget = computed(() =>
  availablePublications.value.find((item) => String(item.id) === selectedTargetId.value) ?? null,
)
const mountPointTarget = computed<MountPointTarget | null>(() => props.person.mountPointTarget ?? null)
const rootPersonName = computed(() => mountPointTarget.value?.rootPersonName ?? '')

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
  const currentMountPointTarget = mountPointTarget.value

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
    rootPersonId: currentMountPointTarget?.rootPersonId,
    rootPersonName: currentMountPointTarget?.rootPersonName,
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
    feedbackMessage.value = '已清除子树起点，将执行全量合并。'
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
    feedback.errorMessage.value = '当前没有可挂载的其他自有族谱。'
    return
  }

  selectedTargetId.value = String(target.id)
  applyTargetPublication(target)
}

async function refreshPublicationFromServer() {
  if (!props.publicationId || !context) return

  const result = await getPublication(props.publicationId)
  // replaceReactiveObject 内部用 Object.keys 操作，PublicationData/PublicationSettings 无 index signature
  // TypeScript 不允许直接 cast 到 Record<string, unknown>，这里的 as any 是已知限制
  context.pub.replaceReactiveObject(context.pub.publication, result.publication as any)
  context.pub.replaceReactiveObject(context.pub.settings, result.settings as any)
  context.pub.selectedPersonId.value = result.publication.people[props.person.id]
    ? props.person.id
    : context.pub.getDefaultSelectedPersonId(result.publication)
}

async function handleMerge() {
  if (!props.publicationId) {
    feedback.errorMessage.value = '请先保存族谱到服务器，再执行物理合并。'
    return
  }
  if (!props.person.isMountPoint || !props.person.mountPointTarget?.publicationId) {
    feedback.errorMessage.value = '请先将当前人物设置为有效挂载点。'
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
    feedback.errorMessage.value = '物理合并失败，请检查权限或稍后重试。'
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
  <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />
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
              <label>共享 - 编辑</label>
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
              <strong v-if="rootPersonName" class="root-name">
                {{ rootPersonName }}
              </strong>
              <em v-else class="root-none">未指定（全量）</em>
              <button
                v-if="rootPersonName"
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
            {{ rootPersonName ? '更换起点' : '视觉化指定起点' }}
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
    @update:model-value="(v: boolean) => { if (!v) showMergeConfirm = false }"
  />

  <SubtreeRootSelector
    v-if="showRootSelector"
    v-model="showRootSelector"
    :publicationId="Number(selectedTargetId)"
    :publicationTitle="selectedTarget?.title"
    @selected="handleRootSelected"
  />
</template>

<style scoped>
/* ── Panel ── */
.branch-mount-panel {
  border: 1px solid rgba(120,95,65,0.12);
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
}
.branch-mount-panel::before {
  content: "";
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  background: #916331;
  border-radius: 0 3px 3px 0;
}

/* ── Header ── */
.branch-mount-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.branch-mount-panel__eyebrow { display: none; }
.branch-mount-panel__header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-9);
}

/* ── Toggle ── */
.branch-mount-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-neutral-9);
  cursor: pointer;
}
.branch-mount-toggle input[type="checkbox"] {
  appearance: none;
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: rgba(120,120,128,.16);
  position: relative;
  cursor: pointer;
  transition: background .2s;
  flex-shrink: 0;
}
.branch-mount-toggle input[type="checkbox"]::after {
  content: "";
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
  transition: transform .2s;
}
.branch-mount-toggle input[type="checkbox"]:checked {
  background: #34C759;
}
.branch-mount-toggle input[type="checkbox"]:checked::after {
  transform: translateX(16px);
}

/* ── Grid ── */
.branch-mount-panel__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 12px;
}

.branch-mount-field,
.branch-mount-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 10px;
  padding: 14px;
  background: rgba(120,95,65,0.04);
  border: 1px solid rgba(120,95,65,0.08);
}

.branch-mount-field > span:first-child,
.branch-mount-meta > span:first-child {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-neutral-6);
  text-transform: none;
  letter-spacing: 0;
}

/* ── Custom Select ── */
.custom-select { position: relative; width: 100%; }
.custom-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(120,95,65,0.12);
  border-radius: 8px;
  padding: 8px 12px;
  background: #fff;
  color: var(--color-neutral-9);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, box-shadow .15s;
}
.custom-select__trigger:hover { border-color: rgba(120,95,65,0.24); }
.custom-select.is-open .custom-select__trigger {
  border-color: var(--color-warning);
  box-shadow: var(--shadow-ring);
}
.custom-select__trigger:disabled { opacity: .4; cursor: not-allowed; }

.custom-select .chevron {
  flex-shrink: 0;
  transition: transform .2s;
  color: var(--color-neutral-6);
}
.custom-select.is-open .chevron { transform: rotate(180deg); }

.custom-select__options {
  background: #fff;
  border: 1px solid rgba(120,95,65,0.12);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.12);
  z-index: 200;
  max-height: 260px;
  overflow-y: auto;
  padding: 6px;
}
.custom-select__options::-webkit-scrollbar { width: 4px; }
.custom-select__options::-webkit-scrollbar-thumb { background: rgba(120,95,65,0.15); border-radius: 4px; }

.custom-select__group label {
  display: block;
  padding: 6px 10px 2px;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-neutral-6);
  text-transform: none;
  letter-spacing: 0;
}

.custom-select__option {
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  color: var(--color-neutral-9);
  transition: background .12s;
}
.custom-select__option:hover { background: rgba(145,99,49,0.08); }

.custom-select__option--clear {
  color: #c43a31;
  border-top: 1px solid rgba(120,95,65,0.08);
  margin-top: 4px;
  border-radius: 0 0 7px 7px;
  font-weight: 500;
}
.custom-select__option--clear:hover { background: rgba(255,59,48,.06); }

/* ── Subtree ── */
.subtree-config {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(120,95,65,0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.subtree-info { display: flex; align-items: center; justify-content: space-between; }
.subtree-info .label { font-size: 10px; font-weight: 500; color: var(--color-neutral-6); }
.root-display { display: flex; align-items: center; gap: 6px; }
.root-name { font-size: 13px; color: var(--color-warning); font-weight: 500; }
.root-none { font-size: 12px; color: #b8a898; font-style: normal; }
.clear-root-btn {
  background: rgba(120,95,65,0.1);
  border: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-neutral-6);
  font-family: inherit;
  line-height: 1;
}
.clear-root-btn:hover { background: rgba(196,58,49,0.12); color: #c43a31; }

.select-root-btn {
  width: 100%;
  padding: 7px 12px;
  border: 1px solid rgba(145,99,49,0.2);
  background: rgba(145,99,49,0.04);
  color: var(--color-warning);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
}
.select-root-btn:hover { background: rgba(145,99,49,0.1); border-color: rgba(145,99,49,0.3); }

/* ── Meta ── */
.branch-mount-meta strong { font-size: 14px; color: var(--color-neutral-9); font-weight: 500; }
.branch-mount-meta em { font-style: normal; font-size: 12px; color: var(--color-neutral-6); }

.branch-mount-panel__feedback { margin: 0; font-size: 12px; color: var(--color-warning); font-weight: 500; }

/* ── Advanced Merge ── */
.advanced-merge-zone {
  margin-top: 0;
  padding: 14px;
  background: rgba(255,59,48,.03);
  border: 1px solid rgba(196,58,49,0.12);
  border-radius: 12px;
}
.advanced-merge-zone__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #c43a31;
}
.advanced-merge-zone__header strong { font-size: 13px; font-weight: 500; }
.advanced-merge-zone p {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-neutral-6);
}

/* ── Buttons ── */
.relation-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(120,95,65,0.12);
  background: #fff;
  color: var(--color-neutral-9);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
}
.relation-btn:hover { background: rgba(145,99,49,0.06); }
.relation-btn--accent {
  background: #c43a31;
  color: #fff;
  border: none;
  font-weight: 500;
}
.relation-btn--accent:hover { opacity: .85; }
.relation-btn--accent:disabled { opacity: .4; cursor: not-allowed; }

@media (max-width: 640px) {
  .branch-mount-panel__grid { grid-template-columns: 1fr; }
}
</style>

