<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import PublicationCanvas from './components/PublicationCanvas.vue'
import { defaultSettings, samplePublication } from './data/sampleFamily'
import { applyRelationshipAction, summarizeDeleteImpact, type RelationshipAction } from './features/editor/publicationOperations'
import { useEditorHistory } from './features/history/useEditorHistory'
import type { EditorSnapshot } from './features/history/historyCore'
import {
  createDraftPackage,
  parseDraftJson,
  parseLocalDraftState,
  serializeDraftPackage,
  serializeLocalDraftState,
} from './features/persistence/draftPersistence'
import { formatValidationIssues } from './features/validation/draftSchema'
import { layoutPublication } from './lib/layout'
import type { FamilyUnit, Person, PublicationData, PublicationSettings } from './types/family'

const STORAGE_KEY = 'genealogy-publication-studio:v1'

const publication = reactive<PublicationData>(structuredClone(samplePublication))
const settings = reactive<PublicationSettings>(structuredClone(defaultSettings))
const selectedPersonId = ref(publication.families[publication.focusFamilyId]?.adults[0] ?? Object.keys(publication.people)[0] ?? '')

const overviewOpen = ref(false)
const layoutPanelOpen = ref(false)
const editorOpen = ref(false)
const historyOpen = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)
const statusMessage = ref('')
const errorMessage = ref('')

const canvasRef = ref<InstanceType<typeof PublicationCanvas> | null>(null)

function createEditorSnapshot(): EditorSnapshot {
  return {
    publication: JSON.parse(JSON.stringify(publication)) as PublicationData,
    settings: JSON.parse(JSON.stringify(settings)) as PublicationSettings,
    selectedPersonId: selectedPersonId.value,
  }
}

function replaceReactiveObject<T extends object>(target: T, source: T) {
  Object.keys(target).forEach((key) => {
    delete (target as Record<string, unknown>)[key]
  })

  Object.assign(target, source)
}

function restoreEditorSnapshot(snapshot: EditorSnapshot) {
  const currentZoom = settings.zoom
  const currentSelectedPersonId = selectedPersonId.value

  replaceReactiveObject(publication, snapshot.publication)
  replaceReactiveObject(settings, snapshot.settings)
  settings.zoom = currentZoom

  if (publication.people[snapshot.selectedPersonId]) {
    selectedPersonId.value = snapshot.selectedPersonId
  } else if (publication.people[currentSelectedPersonId]) {
    selectedPersonId.value = currentSelectedPersonId
  } else {
    selectedPersonId.value = Object.keys(publication.people)[0] ?? ''
  }

  if (!publication.families[publication.focusFamilyId]) {
    publication.focusFamilyId = Object.keys(publication.families)[0] ?? ''
  }

  if (!selectedPersonId.value) {
    editorOpen.value = false
  }
}

const {
  historyPast,
  historyFuture,
  canUndo,
  canRedo,
  visibleHistoryEntries,
  initializeHistoryBaseline,
  scheduleHistoryCommit,
  markHistory,
  undoChange,
  redoChange,
  disposeHistory,
} = useEditorHistory({
  createSnapshot: createEditorSnapshot,
  restoreSnapshot: restoreEditorSnapshot,
})

function listFamilies(): FamilyUnit[] {
  return Object.values(publication.families)
}

function isPersonId(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

function findAdultFamilyIdForPerson(personId: string): string | undefined {
  return listFamilies().find((family) => family.adults.includes(personId))?.id
}

function findParentFamilyIdForPerson(personId: string): string | undefined {
  return listFamilies().find((family) => family.children.includes(personId))?.id
}

const peopleList = computed(() => Object.values(publication.people))
const totalPeople = computed(() => peopleList.value.length)
const selectedPerson = computed(() => publication.people[selectedPersonId.value] ?? null)
const layout = computed(() => layoutPublication(publication, settings))
const aliveCount = computed(() => peopleList.value.filter((person) => !person.death).length)
const deceasedCount = computed(() => totalPeople.value - aliveCount.value)

const selectedAdultFamily = computed(() => {
  const person = selectedPerson.value
  if (!person) {
    return null
  }

  const familyId = findAdultFamilyIdForPerson(person.id)
  return familyId ? publication.families[familyId] : null
})

const selectedParentFamily = computed(() => {
  const person = selectedPerson.value
  if (!person) {
    return null
  }

  const familyId = findParentFamilyIdForPerson(person.id)
  return familyId ? publication.families[familyId] : null
})

const selectedSpouse = computed(() => {
  const person = selectedPerson.value
  const family = selectedAdultFamily.value
  if (!person || !family) {
    return null
  }

  const spouseId = family.adults.find((adultId) => adultId && adultId !== person.id)
  return spouseId ? publication.people[spouseId] ?? null : null
})

const selectedChildren = computed(() => {
  const family = selectedAdultFamily.value
  if (!family) {
    return []
  }

  return family.children.map((childId) => publication.people[childId]).filter((person): person is Person => Boolean(person))
})

const selectedParents = computed(() => {
  const family = selectedParentFamily.value
  if (!family) {
    return []
  }

  return family.adults.map((adultId) => (adultId ? publication.people[adultId] : null)).filter((person): person is Person => Boolean(person))
})

const canAddSpouse = computed(() => {
  const family = selectedAdultFamily.value
  if (!family) {
    return true
  }

  return family.adults.filter(isPersonId).length < 2
})

const parentActionLabel = computed(() => {
  const parentCount = selectedParents.value.length
  if (parentCount === 0) {
    return '新增父母'
  }

  if (parentCount === 1) {
    return '补全父母'
  }

  return '已有完整父母'
})

const hasCompleteParents = computed(() => selectedParents.value.length >= 2)

const selectedChildItems = computed(() =>
  selectedChildren.value.map((person, index, list) => ({
    person,
    index,
    isFirst: index === 0,
    isLast: index === list.length - 1,
  })),
)

const canSwapAdults = computed(() => {
  const family = selectedAdultFamily.value
  return Boolean(family && family.adults.filter(isPersonId).length > 1)
})

const isSelectedBranchFocused = computed(() => {
  const person = selectedPerson.value
  if (!person) {
    return false
  }

  const familyId = findAdultFamilyIdForPerson(person.id)
  return Boolean(familyId && familyId === publication.focusFamilyId)
})

const branchActionLabel = computed(() => (isSelectedBranchFocused.value ? '已是当前宗支' : '设为当前宗支'))

const documentedFieldCount = computed(() =>
  peopleList.value.reduce(
    (total, person) =>
      total + Number(Boolean(person.birth)) + Number(Boolean(person.death || person.age)) + Number(Boolean(person.note)),
    0,
  ),
)

const documentationTotal = computed(() => totalPeople.value * 3)
const documentationScore = computed(() =>
  documentationTotal.value ? Math.round((documentedFieldCount.value / documentationTotal.value) * 100) : 0,
)

const focusFamily = computed(() => publication.families[publication.focusFamilyId] ?? Object.values(publication.families)[0])
const focusFamilyLabel = computed(() => {
  const adults = focusFamily.value?.adults.filter(isPersonId) ?? []

  return adults.map((adultId) => publication.people[adultId]?.name ?? adultId).join(' · ') || '未设置宗支'
})

const metricCards = computed(() => [
  {
    id: 'people',
    label: '入版人物',
    value: `${layout.value.displayedPeople}人`,
    meta: `在世 ${aliveCount.value} · 已故 ${deceasedCount.value}`,
    progress: totalPeople.value ? Math.round((layout.value.displayedPeople / totalPeople.value) * 100) : 0,
    tone: 'amber',
  },
  {
    id: 'documentation',
    label: '信息完整度',
    value: `${documentationScore.value}%`,
    meta: `已填 ${documentedFieldCount.value} / ${documentationTotal.value} 项`,
    progress: documentationScore.value,
    tone: 'ink',
  },
  {
    id: 'generation',
    label: '代际深度',
    value: `${layout.value.generationCount}代`,
    meta: `当前宗支包含 ${focusFamily.value?.children.length ?? 0} 位子代`,
    progress: Math.min(100, layout.value.generationCount * 18),
    tone: 'olive',
  },
  {
    id: 'page',
    label: '出版分页',
    value: `${layout.value.pageCount}页`,
    meta: `${settings.paper} 横向 · 缩放 ${Math.round(settings.zoom * 100)}%`,
    progress: Math.min(100, 28 + layout.value.pageCount * 14),
    tone: 'earth',
  },
])

const taskCards = computed(() => {
  const missingBirth = peopleList.value.filter((person) => !person.birth).length
  const missingLife = peopleList.value.filter((person) => !person.death && !person.age).length
  const missingNote = peopleList.value.filter((person) => !person.note).length

  return [
    {
      id: 'birth',
      title: '出生待补录',
      count: missingBirth,
      description: '出生时间会影响代际排序和出版纪年。',
      tone: 'urgent',
    },
    {
      id: 'life',
      title: '生平待补录',
      count: missingLife,
      description: '建议至少保留卒年或享年。',
      tone: 'warm',
    },
    {
      id: 'note',
      title: '注记待补录',
      count: missingNote,
      description: '房次、排行和支系身份适合写在注记中。',
      tone: 'calm',
    },
  ]
})

function getPersonStatus(person: Person | null): string {
  if (!person) {
    return '未选择'
  }

  return person.death ? '已故' : '在世'
}

const selectedPersonSuggestion = computed(() => {
  const person = selectedPerson.value
  if (!person) {
    return '点击人物卡即可在右侧浮层里编辑。'
  }

  if (!person.birth) {
    return '建议优先补录出生时间，这会影响谱图的时间表达。'
  }

  if (!person.death && !person.age) {
    return '建议补录卒年或享年，让出版卡片的信息闭环更完整。'
  }

  if (!person.note) {
    return '建议补充房次、排行或配偶身份，方便读者快速识别宗支位置。'
  }

  return '当前人物信息较完整，可以继续整理其配偶、子嗣和相关宗支关系。'
})

const selectedPersonDetails = computed(() => {
  const person = selectedPerson.value
  if (!person) {
    return []
  }

  return [
    { label: '状态', value: getPersonStatus(person) },
    { label: '身份', value: person.note || '待补充注记' },
    { label: '出生', value: person.birth || '待补录' },
    { label: '卒年', value: person.death || '未录入' },
    { label: '年龄', value: person.age || '自动推算 / 待补录' },
    { label: '配偶', value: selectedSpouse.value?.name || '未建立配偶关系' },
  ]
})

function sanitizeFileName(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, '-').trim() || '族谱出版预览'
}

function serializeSvg(): string | null {
  const svgElement = canvasRef.value?.getSvgElement?.()
  if (!svgElement) {
    return null
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svgElement)}`
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function downloadSvg() {
  const serialized = serializeSvg()
  if (!serialized) {
    errorMessage.value = '当前画布还没有可导出的 SVG。'
    statusMessage.value = ''
    return
  }

  errorMessage.value = ''
  downloadTextFile(`${sanitizeFileName(publication.title)}.svg`, serialized, 'image/svg+xml;charset=utf-8')
}

function printPublication() {
  const serialized = serializeSvg()
  if (!serialized) {
    errorMessage.value = '当前画布还没有可导出的 SVG。'
    statusMessage.value = ''
    return
  }

  errorMessage.value = ''
  const pageSize = settings.paper === 'A3' ? 'A3 landscape' : 'A4 landscape'
  const printWindow = window.open('', '_blank', 'width=1440,height=960')

  if (!printWindow) {
    return
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>${publication.title}</title>
        <style>
          @page { size: ${pageSize}; margin: 10mm; }
          html, body { margin: 0; background: #ffffff; }
          body { display: flex; justify-content: center; padding: 12mm; }
          svg { width: 100%; height: auto; max-width: 100%; }
        </style>
      </head>
      <body>${serialized}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => printWindow.print()
}

function exportJson() {
  const draft = createDraftPackage(publication, settings)
  downloadTextFile(`${sanitizeFileName(publication.title)}.json`, serializeDraftPackage(draft), 'application/json;charset=utf-8')
  statusMessage.value = '已导出 JSON 草稿。'
  errorMessage.value = ''
}

function openJsonImport() {
  importInputRef.value?.click()
}

async function handleJsonImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  if (!window.confirm('导入 JSON 会覆盖当前草稿，是否继续？')) {
    return
  }

  const parsed = parseDraftJson(await file.text())
  if (!parsed.ok) {
    errorMessage.value = formatValidationIssues(parsed.issues)
    statusMessage.value = ''
    return
  }

  markHistory('导入 JSON 草稿')
  replaceReactiveObject(publication, parsed.value.publication)
  replaceReactiveObject(settings, parsed.value.settings)
  selectedPersonId.value = Object.keys(publication.people)[0] ?? ''
  errorMessage.value = ''
  statusMessage.value = '已导入 JSON 草稿。'
  initializeHistoryBaseline()
  canvasRef.value?.resetView?.()
}

function applyEditorAction(action: RelationshipAction, confirmation?: string) {
  if (confirmation && !window.confirm(confirmation)) {
    return
  }

  const result = applyRelationshipAction(publication, action)
  if (!result.ok) {
    errorMessage.value = formatValidationIssues(result.issues)
    statusMessage.value = ''
    return
  }

  errorMessage.value = ''
  markHistory(result.value.historyLabel)
  replaceReactiveObject(publication, result.value.publication)
  publication.focusFamilyId = result.value.focusFamilyId
  selectedPersonId.value = result.value.selectedPersonId
  editorOpen.value = Boolean(selectedPersonId.value)
  canvasRef.value?.resetView?.()
}

function addSpouse() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'add-spouse', personId: selectedPerson.value.id })
  }
}

function addChild() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'add-child', personId: selectedPerson.value.id })
  }
}

function addParents() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'add-parents', personId: selectedPerson.value.id })
  }
}

function focusSelectedBranch() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'focus-branch', personId: selectedPerson.value.id })
  }
}

function swapPartnerOrder() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'swap-partners', personId: selectedPerson.value.id })
  }
}

function moveChild(childId: string, direction: -1 | 1) {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'move-child', parentPersonId: selectedPerson.value.id, childId, direction })
  }
}

function removeSpouseRelation() {
  const person = selectedPerson.value
  const spouse = selectedSpouse.value
  if (!person || !spouse) {
    return
  }

  applyEditorAction(
    { type: 'remove-spouse', personId: person.id },
    `将解除 ${person.name} 与 ${spouse.name} 的配偶关系，是否继续？`,
  )
}

function removeParentsRelation() {
  const person = selectedPerson.value
  if (!person || !selectedParents.value.length) {
    return
  }

  applyEditorAction(
    { type: 'remove-parents', personId: person.id },
    `将解除 ${person.name} 与 ${selectedParents.value.map((parent) => parent.name).join('、')} 的父母关系，是否继续？`,
  )
}

function deleteSelectedPerson() {
  const person = selectedPerson.value
  if (!person) {
    return
  }

  const impact = summarizeDeleteImpact(publication, person.id)
  const summary = impact
    ? [
        impact.spouseNames.length ? `配偶：${impact.spouseNames.join('、')}` : '',
        impact.parentNames.length ? `父母：${impact.parentNames.join('、')}` : '',
        impact.childNames.length ? `子女：${impact.childNames.join('、')}` : '',
        impact.removedFamilyIds.length ? `清理家庭：${impact.removedFamilyIds.join('、')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  applyEditorAction(
    { type: 'delete-person', personId: person.id },
    `将删除人物“${person.name}”。${summary ? `\n${summary}\n` : '\n'}是否继续？`,
  )
}

function restoreSample() {
  if (!window.confirm('将会覆盖当前草稿，恢复为示例族谱数据。是否继续？')) {
    return
  }

  markHistory('恢复示例族谱')
  replaceReactiveObject(publication, structuredClone(samplePublication))
  replaceReactiveObject(settings, structuredClone(defaultSettings))
  selectedPersonId.value = publication.families[publication.focusFamilyId]?.adults[0] ?? Object.keys(publication.people)[0] ?? ''
  layoutPanelOpen.value = false
  overviewOpen.value = false
  editorOpen.value = false
  historyOpen.value = false
  errorMessage.value = ''
  statusMessage.value = ''
  canvasRef.value?.resetView?.()
}

function handleSelectPerson(personId: string) {
  selectedPersonId.value = personId
  editorOpen.value = true
}

function toggleLayoutPanel() {
  layoutPanelOpen.value = !layoutPanelOpen.value
  if (layoutPanelOpen.value) {
    overviewOpen.value = false
    historyOpen.value = false
  }
}

function toggleOverviewPanel() {
  overviewOpen.value = !overviewOpen.value
  if (overviewOpen.value) {
    layoutPanelOpen.value = false
    historyOpen.value = false
  }
}

function toggleHistoryPanel() {
  historyOpen.value = !historyOpen.value
  if (historyOpen.value) {
    layoutPanelOpen.value = false
    overviewOpen.value = false
  }
}

function openEditor() {
  if (!selectedPerson.value) {
    return
  }

  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

function resetCanvasView() {
  canvasRef.value?.resetView?.()
}

function adjustZoom(delta: number) {
  const nextValue = Number((settings.zoom + delta).toFixed(2))
  settings.zoom = Math.min(1.35, Math.max(0.55, nextValue))
}

function handleHistoryShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
    return
  }

  if (!(event.ctrlKey || event.metaKey)) {
    return
  }

  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undoChange()
    return
  }

  if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault()
    redoChange()
  }
}

function applyDraft(raw: string | null) {
  if (!raw) {
    return
  }

  const parsed = parseLocalDraftState(raw)
  if (!parsed.ok) {
    localStorage.removeItem(STORAGE_KEY)
    errorMessage.value = formatValidationIssues(parsed.issues)
    statusMessage.value = ''
    return
  }

  replaceReactiveObject(publication, parsed.value.publication)
  replaceReactiveObject(settings, parsed.value.settings)
  selectedPersonId.value = parsed.value.selectedPersonId ?? Object.keys(publication.people)[0] ?? ''
}

applyDraft(localStorage.getItem(STORAGE_KEY))
initializeHistoryBaseline()

onMounted(() => {
  window.addEventListener('keydown', handleHistoryShortcut)
})

onBeforeUnmount(() => {
  disposeHistory()
  window.removeEventListener('keydown', handleHistoryShortcut)
})

watch(
  () => selectedPerson.value,
  (person) => {
    if (!person) {
      editorOpen.value = false
    }
  },
)

watch(
  () => [publication, settings],
  () => {
    scheduleHistoryCommit()
  },
  { deep: true },
)

watch(
  () => [publication, settings, selectedPersonId.value],
  () => {
    localStorage.setItem(STORAGE_KEY, serializeLocalDraftState(publication, settings, selectedPersonId.value))
  },
  { deep: true },
)
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <p class="topbar__eyebrow">Genealogy Publication</p>
        <h1>族谱无限画布</h1>
        <p class="topbar__summary">
          人物卡和连线直接存在于无限画布中。现在人物浮层除了基础资料，还可以直接新增配偶、子女和父母关系。
        </p>
      </div>

      <div class="topbar__actions">
        <input ref="importInputRef" class="visually-hidden" type="file" accept="application/json,.json" @change="handleJsonImport" />
        <button class="btn btn--secondary" type="button" @click="openJsonImport">导入 JSON</button>
        <button class="btn btn--secondary" type="button" @click="exportJson">导出 JSON</button>
        <button class="btn btn--secondary" type="button" @click="restoreSample">恢复示例</button>
        <button class="btn btn--secondary" type="button" @click="downloadSvg">导出 SVG</button>
        <button class="btn btn--primary" type="button" @click="printPublication">打印排版</button>
      </div>
    </header>

    <div v-if="errorMessage || statusMessage" class="feedback-strip" :class="{ 'feedback-strip--error': errorMessage }">
      <strong>{{ errorMessage ? '需要处理' : '操作完成' }}</strong>
      <span>{{ errorMessage || statusMessage }}</span>
      <button type="button" @click="errorMessage = ''; statusMessage = ''">关闭</button>
    </div>

    <main class="workspace">
      <section class="editor-workspace">
        <div class="floating-toolbar floating-toolbar--left">
          <button class="tool-btn" :class="{ 'tool-btn--active': layoutPanelOpen }" type="button" @click="toggleLayoutPanel">
            版式设置
          </button>
          <button class="tool-btn" :class="{ 'tool-btn--active': overviewOpen }" type="button" @click="toggleOverviewPanel">
            出版摘要
          </button>
          <button class="tool-btn" :class="{ 'tool-btn--active': historyOpen }" type="button" @click="toggleHistoryPanel">
            操作历史
          </button>
          <button class="tool-btn" type="button" @click="resetCanvasView">居中画布</button>
        </div>

        <div class="floating-toolbar floating-toolbar--right">
          <div class="status-chip">
            <span>当前宗支</span>
            <strong>{{ focusFamilyLabel }}</strong>
          </div>
          <div class="history-controls">
            <button class="history-controls__btn" type="button" :disabled="!canUndo" @click="undoChange">撤销</button>
            <button class="history-controls__btn" type="button" :disabled="!canRedo" @click="redoChange">重做</button>
          </div>
          <div class="zoom-control">
            <button class="zoom-control__btn" type="button" aria-label="缩小" @click="adjustZoom(-0.05)">-</button>
            <span>{{ Math.round(settings.zoom * 100) }}%</span>
            <button class="zoom-control__btn" type="button" aria-label="放大" @click="adjustZoom(0.05)">+</button>
          </div>
          <button v-if="selectedPerson" class="tool-btn tool-btn--accent" type="button" @click="openEditor">人物编辑</button>
        </div>

        <Transition name="float-panel">
          <section v-if="layoutPanelOpen" class="floating-panel floating-panel--left">
            <div class="floating-panel__header">
              <div>
                <p class="floating-panel__eyebrow">Layout</p>
                <h2>版式设置</h2>
              </div>
              <button class="floating-panel__close" type="button" @click="layoutPanelOpen = false">关闭</button>
            </div>

            <label class="field">
              <span>纸张尺寸</span>
              <select v-model="settings.paper">
                <option value="A3">A3 横向</option>
                <option value="A4">A4 横向</option>
              </select>
            </label>

            <label class="field">
              <span>人物卡宽度 {{ settings.cardWidth }}px</span>
              <input v-model="settings.cardWidth" type="range" min="142" max="176" step="2" />
            </label>

            <label class="field">
              <span>代际间距 {{ settings.generationGap }}px</span>
              <input v-model="settings.generationGap" type="range" min="120" max="220" step="10" />
            </label>

            <label class="field">
              <span>兄弟间距 {{ settings.siblingGap }}px</span>
              <input v-model="settings.siblingGap" type="range" min="56" max="140" step="4" />
            </label>

            <label class="field">
              <span>字体倍率 {{ settings.fontScale.toFixed(2) }}</span>
              <input v-model="settings.fontScale" type="range" min="0.88" max="1.18" step="0.02" />
            </label>

            <div class="toggle-row">
              <label class="toggle">
                <input v-model="settings.showDeath" type="checkbox" />
                <span>显示卒年</span>
              </label>

              <label class="toggle">
                <input v-model="settings.showAge" type="checkbox" />
                <span>显示年龄</span>
              </label>

              <label class="toggle">
                <input v-model="settings.showNote" type="checkbox" />
                <span>显示注记</span>
              </label>
            </div>
          </section>
        </Transition>

        <Transition name="float-panel">
          <section v-if="overviewOpen" class="floating-panel floating-panel--right">
            <div class="floating-panel__header">
              <div>
                <p class="floating-panel__eyebrow">Overview</p>
                <h2>出版摘要</h2>
              </div>
              <button class="floating-panel__close" type="button" @click="overviewOpen = false">关闭</button>
            </div>

            <div class="metrics-grid">
              <article v-for="card in metricCards" :key="card.id" class="metric-tile" :class="`metric-tile--${card.tone}`">
                <span class="metric-tile__label">{{ card.label }}</span>
                <strong class="metric-tile__value">{{ card.value }}</strong>
                <p class="metric-tile__meta">{{ card.meta }}</p>
                <div class="metric-tile__track">
                  <div class="metric-tile__fill" :style="{ width: `${card.progress}%` }" />
                </div>
              </article>
            </div>

            <div class="task-stack">
              <article v-for="task in taskCards" :key="task.id" class="task-row" :class="`task-row--${task.tone}`">
                <div class="task-row__head">
                  <strong>{{ task.title }}</strong>
                  <span>{{ task.count ? `待处理 ${task.count}` : '已完善' }}</span>
                </div>
                <p>{{ task.description }}</p>
              </article>
            </div>
          </section>
        </Transition>

        <Transition name="float-panel">
          <section v-if="historyOpen" class="floating-panel floating-panel--right floating-panel--history">
            <div class="floating-panel__header">
              <div>
                <p class="floating-panel__eyebrow">History</p>
                <h2>操作历史</h2>
              </div>
              <button class="floating-panel__close" type="button" @click="historyOpen = false">关闭</button>
            </div>

            <div class="history-panel__summary">
              <strong>可撤销 {{ historyPast.length }} 步</strong>
              <span>可重做 {{ historyFuture.length }} 步</span>
            </div>

            <div class="history-panel__actions">
              <button class="relation-btn" type="button" :disabled="!canUndo" @click="undoChange">撤销上一步</button>
              <button class="relation-btn" type="button" :disabled="!canRedo" @click="redoChange">重做上一步</button>
            </div>

            <p class="history-panel__hint">快捷键支持 `Ctrl/Command + Z`，重做支持 `Ctrl/Command + Y` 或 `Shift + Z`。</p>

            <div v-if="visibleHistoryEntries.length" class="history-list">
              <article v-for="(entry, index) in visibleHistoryEntries" :key="entry.id" class="history-entry">
                <div class="history-entry__meta">
                  <span>{{ entry.time }}</span>
                  <em v-if="index === 0">最近</em>
                </div>
                <strong>{{ entry.label }}</strong>
              </article>
            </div>

            <p v-else class="history-empty">当前还没有可撤销的操作，开始编辑后会在这里记录。</p>
          </section>
        </Transition>

        <div class="workspace-hint">
          <span>拖拽空白区域平移谱图</span>
          <span>点击人物卡打开编辑浮层</span>
        </div>

        <PublicationCanvas
          ref="canvasRef"
          :publication="publication"
          :settings="settings"
          :layout="layout"
          :selected-person-id="selectedPersonId"
          @update-zoom="settings.zoom = $event"
          @select-person="handleSelectPerson"
        />

        <Transition name="editor-sheet">
          <div v-if="editorOpen && selectedPerson" class="editor-overlay">
            <button class="editor-overlay__scrim" type="button" aria-label="关闭人物编辑" @click="closeEditor" />

            <aside class="editor-sheet-panel">
              <div class="editor-sheet-panel__header">
                <div>
                  <p class="editor-sheet-panel__eyebrow">Person Editor</p>
                  <h3>{{ selectedPerson.name }}</h3>
                </div>
                <button class="editor-sheet-panel__close" type="button" @click="closeEditor">关闭</button>
              </div>

              <div class="editor-focus">
                <div class="editor-focus__title">
                  <div>
                    <p>当前人物</p>
                    <h3>{{ selectedPerson.name }}</h3>
                  </div>
                  <span>{{ selectedPerson.note || '待补注记' }}</span>
                </div>
                <p class="editor-focus__hint">{{ selectedPersonSuggestion }}</p>

                <div class="editor-focus__grid">
                  <div v-for="item in selectedPersonDetails" :key="item.label" class="editor-mini-card">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>
              </div>

              <section class="relationship-panel">
                <div class="relationship-panel__header">
                  <div>
                    <p class="relationship-panel__eyebrow">Relations</p>
                    <h4>关系编辑</h4>
                  </div>
                  <span class="relationship-panel__badge">{{ selectedChildren.length }} 位子女</span>
                </div>

                <div class="relationship-grid">
                  <article class="relationship-card">
                    <span>配偶</span>
                    <strong>{{ selectedSpouse?.name || '未建立配偶关系' }}</strong>
                  </article>
                  <article class="relationship-card">
                    <span>父母</span>
                    <strong>{{ selectedParents.length ? selectedParents.map((person) => person.name).join(' · ') : '未建立父母关系' }}</strong>
                  </article>
                  <article class="relationship-card relationship-card--wide">
                    <span>子女</span>
                    <strong>{{ selectedChildren.length ? selectedChildren.map((person) => person.name).join(' · ') : '暂无子女' }}</strong>
                  </article>
                </div>

                <div class="relationship-actions">
                  <button class="relation-btn" type="button" :disabled="!canAddSpouse" @click="addSpouse">新增配偶</button>
                  <button class="relation-btn" type="button" @click="addChild">新增子女</button>
                  <button class="relation-btn" type="button" :disabled="hasCompleteParents" @click="addParents">
                    {{ parentActionLabel }}
                  </button>
                  <button class="relation-btn relation-btn--danger" type="button" :disabled="!selectedSpouse" @click="removeSpouseRelation">
                    解除配偶关系
                  </button>
                  <button class="relation-btn relation-btn--danger" type="button" :disabled="!selectedParents.length" @click="removeParentsRelation">
                    解除父母关系
                  </button>
                </div>

                <div class="branch-actions">
                  <button class="relation-btn relation-btn--accent" type="button" :disabled="isSelectedBranchFocused" @click="focusSelectedBranch">
                    {{ branchActionLabel }}
                  </button>
                  <button class="relation-btn" type="button" :disabled="!canSwapAdults" @click="swapPartnerOrder">切换夫妻位置</button>
                </div>

                <div v-if="selectedChildItems.length" class="child-order-panel">
                  <div class="child-order-panel__header">
                    <span>子女顺序</span>
                    <strong>左右顺序会影响画布排布</strong>
                  </div>

                  <div class="child-order-list">
                    <article v-for="child in selectedChildItems" :key="child.person.id" class="child-order-item">
                      <button class="child-order-item__main" type="button" @click="handleSelectPerson(child.person.id)">
                        <strong>{{ child.index + 1 }}. {{ child.person.name }}</strong>
                        <span>{{ child.person.note || '子女' }}</span>
                      </button>
                      <div class="child-order-item__actions">
                        <button class="relation-icon-btn" type="button" :disabled="child.isFirst" @click="moveChild(child.person.id, -1)">↑</button>
                        <button class="relation-icon-btn" type="button" :disabled="child.isLast" @click="moveChild(child.person.id, 1)">↓</button>
                      </div>
                    </article>
                  </div>
                </div>
              </section>

              <div class="editor-form">
                <label class="field">
                  <span>姓名</span>
                  <input v-model="selectedPerson.name" type="text" />
                </label>

                <label class="field">
                  <span>出生</span>
                  <input v-model="selectedPerson.birth" type="text" placeholder="如：1978年十月初八" />
                </label>

                <label class="field">
                  <span>卒年</span>
                  <input v-model="selectedPerson.death" type="text" placeholder="如：2022年五月" />
                </label>

                <label class="field">
                  <span>年龄</span>
                  <input v-model="selectedPerson.age" type="text" placeholder="支持直接填写 71岁" />
                </label>

                <label class="field">
                  <span>注记</span>
                  <input v-model="selectedPerson.note" type="text" placeholder="如：长房 / 次孙 / 配偶" />
                </label>
              </div>

              <section class="danger-zone">
                <div>
                  <p>危险操作</p>
                  <span>删除会同步清理此人物在配偶、父母、子女关系中的引用。</span>
                </div>
                <button class="relation-btn relation-btn--danger" type="button" @click="deleteSelectedPerson">删除人物</button>
              </section>
            </aside>
          </div>
        </Transition>
      </section>
    </main>
  </div>
</template>
