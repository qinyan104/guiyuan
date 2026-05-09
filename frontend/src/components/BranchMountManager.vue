<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'

import { mergeBranch } from '../api/accessManage'
import { getPublication, listPublications, type PublicationSummary } from '../api/publication'
import type { Person } from '../types/family'

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
const selectedTargetId = ref('')

const availablePublications = computed(() =>
  publications.value.filter(
    (item) => item.id !== props.publicationId && item.accessRole !== 'VIEWER',
  ),
)

const selectedTarget = computed(() =>
  availablePublications.value.find((item) => String(item.id) === selectedTargetId.value) ?? null,
)

function formatAccessRole(role: string): string {
  if (role === 'OWNER') return '我的'
  if (role === 'EDITOR') return '共享·编辑'
  return role
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
  }
  feedbackMessage.value = `已选择目标族谱：${publication.title}`
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

function handleTargetChange(event: Event) {
  const nextId = (event.target as HTMLSelectElement).value
  selectedTargetId.value = nextId

  if (!nextId) {
    props.person.isMountPoint = false
    props.person.mountPointTarget = undefined
    feedbackMessage.value = '已清除挂载目标。'
    return
  }

  applyTargetPublication(selectedTarget.value)
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
  if (!confirm('物理合并会把目标族谱当前快照复制进当前族谱，并清除这个挂载点。确定继续吗？')) {
    return
  }

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

onMounted(loadAccessiblePublications)
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

    <p class="branch-mount-panel__hint">
      挂载只建立关联，不会自动把目标族谱写入当前稿件；“物理合并”才会复制快照并清除这个挂载点。
    </p>

    <div class="branch-mount-panel__grid">
      <label class="branch-mount-field">
        <span>目标族谱</span>
        <select :disabled="loading || !availablePublications.length" :value="selectedTargetId" @change="handleTargetChange">
          <option value="">选择一个目标族谱</option>
          <option v-for="item in availablePublications" :key="item.id" :value="item.id">
            {{ item.title }} ({{ formatAccessRole(item.accessRole) }})
          </option>
        </select>
      </label>

      <article class="branch-mount-meta">
        <span>当前状态</span>
        <strong>{{ person.isMountPoint ? '挂载点已建立' : '普通人物节点' }}</strong>
        <em>{{ person.mountPointTarget?.publicationTitle || '尚未选择目标族谱' }}</em>
      </article>
    </div>

    <p v-if="feedbackMessage" class="branch-mount-panel__feedback">{{ feedbackMessage }}</p>

    <div class="branch-mount-actions">
      <button class="relation-btn" type="button" @click="handleToggleMountPoint(!person.isMountPoint)">
        {{ person.isMountPoint ? '断开挂载' : '设为挂载点' }}
      </button>
      <button
        class="relation-btn relation-btn--accent"
        type="button"
        :disabled="mergePending || !person.isMountPoint || !person.mountPointTarget?.publicationId"
        @click="handleMerge"
      >
        {{ mergePending ? '合并中…' : '执行物理合并' }}
      </button>
    </div>
  </section>
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

.branch-mount-panel__hint {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
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

.branch-mount-field select {
  border: 1px solid rgba(91, 70, 42, 0.14);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
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

.branch-mount-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .branch-mount-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
