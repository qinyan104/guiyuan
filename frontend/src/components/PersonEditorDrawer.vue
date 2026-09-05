<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useFeedback } from "../composables/useFeedback"
import FeedbackStrip from "../components/FeedbackStrip.vue"
import BranchMountManager from "./BranchMountManager.vue"
import AppSelect from "./AppSelect.vue"
import type { FamilyBranchMode, Gender, Person } from "../types/family"
import { uploadPhoto, getPhotoUrl } from "../api/photo"

interface PersonDetailItem {
  label: string
  value: string
}

interface ChildOrderItem {
  person: Person
  index: number
  isFirst: boolean
  isLast: boolean
}

type EditablePersonField = "name" | "birth" | "death" | "age" | "titleName" | "clan" | "note" | "avatarUrl"

const feedback = useFeedback()

const props = defineProps<{
  open: boolean
  person: Person
  publicationId: number | null
  suggestion: string
  lineageSuggestion: string
  details: PersonDetailItem[]
  spouse: Person | null
  parents: Person[]
  children: Person[]
  childItems: ChildOrderItem[]
  canAddSpouse: boolean
  hasCompleteParents: boolean
  canSwapAdults: boolean
  isSelectedBranchFocused: boolean
  canSetBranchMode: boolean
  branchMode: FamilyBranchMode | ""
  parentActionLabel: string
  branchActionLabel: string
  kinshipLabel?: string | null
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "select-person", id: string): void
  (e: "add-spouse"): void
  (e: "add-child", g: Gender): void
  (e: "add-parents"): void
  (e: "remove-spouse"): void
  (e: "remove-parents"): void
  (e: "focus-branch"): void
  (e: "update-branch-mode", m: FamilyBranchMode): void
  (e: "swap-partners"): void
  (e: "move-child", p: { childId: string; direction: -1 | 1 }): void
  (e: "update-person-field", p: { field: EditablePersonField; value: string }): void
  (e: "update-person-gender", g: Gender): void
  (e: "apply-note-suggestion", v: string): void
  (e: "delete-person"): void
}>()

function updatePersonField(field: EditablePersonField, event: Event) {
  const target = event.target as HTMLInputElement
  emit("update-person-field", { field, value: target.value })
}

function updatePersonGender(genderVal: string) {
  emit("update-person-gender", genderVal as Gender)
}

function handleUploadAvatarClick(e: MouseEvent) {
  const container = (e.currentTarget as HTMLElement)?.closest('.ped-avatar-container')
  const fileInput = container?.querySelector<HTMLInputElement>('.ped-avatar-file-input')
  fileInput?.click()
}

async function handleUploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (file.size > 5 * 1024 * 1024) {
    feedback.errorMessage.value = "照片过大，请上传 5MB 以内的文件"
    return
  }
  if (!file.type.startsWith("image/")) {
    feedback.errorMessage.value = "仅支持图片文件"
    return
  }
  if (!props.publicationId) {
    feedback.errorMessage.value = "请先保存族谱到服务器后再上传照片"
    return
  }
  try {
    const pid = await uploadPhoto(props.person.id, props.publicationId, file)
    emit("update-person-field", { field: "avatarUrl", value: getPhotoUrl(pid) })
  } catch {
    feedback.errorMessage.value = "上传失败"
  }
}

// Child Drag and Drop state
const draggingChildId = ref<string | null>(null)
const dragOverChildId = ref<string | null>(null)

function handleChildDragStart(id: string, e: DragEvent) {
  draggingChildId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move"
  }
}

function handleChildDragOver(id: string, e: DragEvent) {
  e.preventDefault()
  dragOverChildId.value = id
}

function handleChildDragLeave() {
  dragOverChildId.value = null
}

function handleChildDrop(targetId: string, e: DragEvent) {
  e.preventDefault()
  const sourceId = draggingChildId.value
  draggingChildId.value = null
  dragOverChildId.value = null
  if (!sourceId || sourceId === targetId) return
  const si = props.childItems.findIndex((c) => c.person.id === sourceId)
  const ti = props.childItems.findIndex((c) => c.person.id === targetId)
  if (si === -1 || ti === -1) return
  for (let i = 0; i < Math.abs(ti - si); i++) {
    emit("move-child", { childId: sourceId, direction: ti > si ? 1 : -1 })
  }
}

function handleChildDragEnd() {
  draggingChildId.value = null
  dragOverChildId.value = null
}

function getGenderClass(g: Gender) {
  return g === "male" ? "is-male" : g === "female" ? "is-female" : "is-unknown"
}

function extractYear(s: string | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d{4})/)
  return m ? parseInt(m[1]) : null
}

const autoAge = ref<string>("")

const genderOptions = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "unknown", label: "未知" },
]

watch(
  [() => props.person.birth, () => props.person.death],
  ([b, d]) => {
    const by = extractYear(b)
    if (!by) {
      autoAge.value = ""
      return
    }
    const dy = extractYear(d)
    if (dy && dy > by && dy - by < 150) {
      autoAge.value = String(dy - by)
      emit("update-person-field", { field: "age", value: String(dy - by) })
    } else if (!d || !dy) {
      autoAge.value = String(new Date().getFullYear() - by)
    } else {
      autoAge.value = ""
    }
  },
  { immediate: true },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) {
    emit("close")
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <FeedbackStrip
    :errorMessage="feedback.errorMessage.value"
    :statusMessage="feedback.statusMessage.value"
    @dismiss="feedback.dismiss"
  />
  <Teleport to="body">
    <Transition name="ped-fade">
      <div v-if="open" class="ped-overlay" @click.self="$emit('close')">
        <article class="ped-card" role="dialog" aria-label="编辑人物" @click.stop>
          <!-- Clean Header -->
          <header class="ped-header">
            <div class="ped-header-left">
              <h3 class="ped-header-title">编辑人物</h3>
            </div>

            <div class="ped-header-right">
              <button class="ped-close-btn" title="关闭 (Esc)" @click="$emit('close')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </header>

          <!-- Main Body: Two Columns -->
          <div class="ped-body">
            <!-- Left Side: Avatar, Name, Context Tags -->
            <div class="ped-sidebar">
              <div class="ped-avatar-container">
                <label :class="['ped-avatar-wrap', { 'has-avatar': Boolean(person.avatarUrl) }]" title="点击上传/更换人物照片">
                  <img v-if="person.avatarUrl" :src="person.avatarUrl" class="ped-avatar-img" />
                  <div v-else class="ped-avatar-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="9" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
                    <span class="ped-avatar-tip">上传照片</span>
                  </div>
                  <input type="file" accept="image/*" class="ped-avatar-file-input" @change="handleUploadAvatar" />
                </label>
                <button v-if="person.avatarUrl" type="button" class="ped-change-photo-btn" @click="handleUploadAvatarClick">
                  更换照片
                </button>
              </div>

              <div class="ped-identity-wrap">
                <input
                  :value="person.name"
                  type="text"
                  class="ped-inp ped-inp--hero"
                  placeholder="姓名"
                  @input="updatePersonField('name', $event)"
                />

                <div v-if="kinshipLabel || lineageSuggestion" class="ped-context-chips">
                  <span v-if="kinshipLabel" class="ped-context-chip ped-context-chip--accent">{{ kinshipLabel }}</span>
                  <span v-if="lineageSuggestion" class="ped-context-chip">{{ lineageSuggestion }}</span>
                </div>
              </div>
            </div>

            <!-- Right Side: Form Sections -->
            <div class="ped-content">
              <!-- Group 1: Basic Info -->
              <div class="ped-group">
                <div class="ped-group-head">基本信息</div>
                <div class="ped-row">
                  <label class="ped-field">
                    <span class="ped-field-label">生年</span>
                    <input
                      :value="person.birth"
                      type="text"
                      class="ped-inp"
                      placeholder="例：1906 或 光绪三十二年"
                      @input="updatePersonField('birth', $event)"
                    />
                  </label>
                  <label class="ped-field">
                    <span class="ped-field-label">卒年</span>
                    <input
                      :value="person.death"
                      type="text"
                      class="ped-inp"
                      placeholder="健在留空"
                      @input="updatePersonField('death', $event)"
                    />
                  </label>
                </div>
                <div class="ped-row">
                  <label class="ped-field">
                    <span class="ped-field-label">性别</span>
                    <AppSelect
                      :modelValue="person.gender"
                      :options="genderOptions"
                      placeholder="选择性别"
                      @update:modelValue="updatePersonGender"
                    />
                  </label>
                  <label class="ped-field">
                    <span class="ped-field-label">{{ person.death ? '享年' : '年龄' }}</span>
                    <input
                      :value="person.age"
                      type="text"
                      class="ped-inp"
                      :placeholder="autoAge || '自动推算'"
                      @input="updatePersonField('age', $event)"
                    />
                  </label>
                </div>
              </div>

              <!-- Group 2: Relatives -->
              <div class="ped-group">
                <div class="ped-group-head">亲属关系</div>

                <!-- Spouses -->
                <div class="ped-rel-row">
                  <span class="ped-rel-label">配偶</span>
                  <div class="ped-rel-body">
                    <template v-if="spouse">
                      <button class="ped-person-chip" :class="getGenderClass(spouse.gender)" @click="$emit('select-person', spouse.id)">
                        <span class="ped-person-avatar-circle">{{ spouse.name.charAt(0) }}</span>
                        <span class="ped-person-name">{{ spouse.name }}</span>
                      </button>
                      <button class="ped-aux-btn ped-aux-btn--danger" @click="$emit('remove-spouse')">解除关联</button>
                    </template>
                    <button v-else-if="canAddSpouse" class="ped-add-btn" @click="$emit('add-spouse')">+ 添加配偶</button>
                    <span v-else class="ped-nil">—</span>
                  </div>
                </div>

                <!-- Parents -->
                <div class="ped-rel-row">
                  <span class="ped-rel-label">父母</span>
                  <div class="ped-rel-body">
                    <template v-if="parents.length">
                      <button v-for="p in parents" :key="p.id" class="ped-person-chip" :class="getGenderClass(p.gender)" @click="$emit('select-person', p.id)">
                        <span class="ped-person-avatar-circle">{{ p.name.charAt(0) }}</span>
                        <span class="ped-person-name">{{ p.name }}</span>
                      </button>
                      <button class="ped-aux-btn ped-aux-btn--danger" @click="$emit('remove-parents')">解除关联</button>
                    </template>
                    <button v-else-if="!hasCompleteParents" class="ped-add-btn" @click="$emit('add-parents')">
                      {{ parentActionLabel || '+ 添加父母' }}
                    </button>
                    <span v-else class="ped-nil">—</span>
                  </div>
                </div>

                <!-- Children -->
                <div class="ped-rel-row">
                  <span class="ped-rel-label">子女</span>
                  <div class="ped-rel-body">
                    <template v-if="childItems.length">
                      <button
                        v-for="c in childItems"
                        :key="c.person.id"
                        class="ped-person-chip ped-person-chip--drag"
                        :class="[getGenderClass(c.person.gender), { 'is-drag-over': dragOverChildId === c.person.id, 'is-dragging': draggingChildId === c.person.id }]"
                        draggable="true"
                        title="可拖拽排序"
                        @dragstart="handleChildDragStart(c.person.id, $event)"
                        @dragover="handleChildDragOver(c.person.id, $event)"
                        @dragleave="handleChildDragLeave"
                        @drop="handleChildDrop(c.person.id, $event)"
                        @dragend="handleChildDragEnd"
                        @click="$emit('select-person', c.person.id)"
                      >
                        <span class="ped-drag-handle" title="拖拽排序">
                          <svg width="9" height="12" viewBox="0 0 10 14" fill="currentColor">
                            <circle cx="3" cy="3" r="1.2" />
                            <circle cx="7" cy="3" r="1.2" />
                            <circle cx="3" cy="7" r="1.2" />
                            <circle cx="7" cy="7" r="1.2" />
                            <circle cx="3" cy="11" r="1.2" />
                            <circle cx="7" cy="11" r="1.2" />
                          </svg>
                        </span>
                        <span class="ped-person-index-badge">{{ c.index + 1 }}</span>
                        <span class="ped-person-avatar-circle">{{ c.person.name.charAt(0) }}</span>
                        <span class="ped-person-name">{{ c.person.name }}</span>
                      </button>
                    </template>
                    <button class="ped-add-btn" @click="$emit('add-child', 'male')">+ 添子</button>
                    <button class="ped-add-btn" @click="$emit('add-child', 'female')">+ 添女</button>
                  </div>
                </div>
              </div>

              <!-- Group 3: Branch Settings -->
              <div class="ped-group">
                <div class="ped-group-head">支系设置</div>
                <div class="ped-chips-row">
                  <button class="ped-chip-btn ped-chip-btn--accent" :disabled="isSelectedBranchFocused" @click="$emit('focus-branch')">
                    {{ branchActionLabel }}
                  </button>
                  <button
                    v-if="canSetBranchMode"
                    class="ped-chip-btn"
                    :class="{ 'is-active': branchMode === 'married-out' }"
                    @click="$emit('update-branch-mode', 'married-out')"
                  >
                    外嫁
                  </button>
                  <button
                    v-if="canSetBranchMode"
                    class="ped-chip-btn"
                    :class="{ 'is-active': branchMode === 'uxorilocal' }"
                    @click="$emit('update-branch-mode', 'uxorilocal')"
                  >
                    招婿
                  </button>
                </div>
              </div>

              <!-- Group 4: Notes & Branch Mount -->
              <div class="ped-group">
                <div class="ped-group-head">生平与注记</div>
                <label class="ped-field">
                  <div class="ped-field-header-row">
                    <span class="ped-field-label">排行 / 注记</span>
                    <button
                      v-if="lineageSuggestion && person.note !== lineageSuggestion"
                      type="button"
                      class="ped-suggestion-btn"
                      @click="$emit('apply-note-suggestion', lineageSuggestion)"
                    >
                      采纳「{{ lineageSuggestion }}」
                    </button>
                  </div>
                  <textarea
                    :value="person.note"
                    rows="3"
                    class="ped-textarea"
                    placeholder="例：长房长子、贡生、任职略历、墓葬所处等"
                    @input="updatePersonField('note', $event)"
                  ></textarea>
                </label>
                <div class="ped-divider"></div>
                <BranchMountManager :person="person" :publicationId="publicationId" />
              </div>

              <!-- Danger Zone -->
              <div class="ped-danger-zone">
                <button class="ped-delete-btn" @click="$emit('delete-person')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  删除人物
                </button>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <footer class="ped-footer">
            <button class="ped-done-btn" @click="$emit('close')">完成</button>
          </footer>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ── */
.ped-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 1000);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-overlay, rgba(20, 19, 18, 0.45));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 20px;
}

/* ── Card ── */
.ped-card {
  width: 860px;
  max-width: 92vw;
  max-height: 88vh;
  background: var(--color-panel-bg);
  border-radius: var(--radius-xl, 20px);
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-whisper, 0 24px 60px rgba(0, 0, 0, 0.16));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

/* ── Classical Header ── */
.ped-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  flex-shrink: 0;
}

.ped-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ped-header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-10);
  margin: 0;
  line-height: 1.3;
}

.ped-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-neutral-6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast, 150ms) var(--ease-breath);
}

.ped-close-btn:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-10);
  border-color: var(--color-card-stroke);
}

/* ── Body ── */
.ped-body {
  display: flex;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

/* ── Sidebar (Left) ── */
.ped-sidebar {
  width: 240px;
  flex-shrink: 0;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border-right: 1px solid var(--color-card-stroke);
  overflow-y: auto;
  background: var(--color-neutral-1, rgba(0, 0, 0, 0.01));
}

.ped-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ped-avatar-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--duration-fast, 150ms) var(--ease-breath);
}

.ped-avatar-wrap:not(.has-avatar) {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  border: 1px dashed var(--color-neutral-4);
  background: var(--color-neutral-2);
}

.ped-avatar-wrap:not(.has-avatar):hover {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.ped-avatar-wrap.has-avatar {
  border: none;
  background: transparent;
  padding: 0;
  max-width: 140px;
  max-height: 140px;
}

.ped-avatar-img {
  max-width: 140px;
  max-height: 140px;
  width: auto;
  height: auto;
  object-fit: contain;
  border: none;
  display: block;
}

.ped-change-photo-btn {
  font-size: 11px;
  color: var(--color-neutral-6);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.ped-change-photo-btn:hover {
  color: var(--color-accent);
  background: var(--color-neutral-2);
}

.ped-avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--color-neutral-5);
}

.ped-avatar-tip {
  font-size: 11px;
  color: var(--color-neutral-6);
}

.ped-avatar-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.ped-identity-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ped-inp--hero {
  font-size: 24px;
  font-family: var(--font-serif);
  font-weight: 700;
  text-align: center;
  background: transparent !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  color: var(--color-neutral-10);
  padding: 4px 0;
  outline: none !important;
  box-shadow: none !important;
  width: 100%;
  transition: border-color var(--duration-fast, 150ms);
}

.ped-inp--hero:focus {
  border-bottom-color: var(--color-accent) !important;
}

.ped-context-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}

.ped-context-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  color: var(--color-neutral-7);
  font-size: 11px;
  font-weight: 500;
}

.ped-context-chip--accent {
  background: var(--color-accent-muted);
  border-color: rgba(184, 51, 42, 0.2);
  color: var(--color-accent);
}

.ped-context-hint {
  margin: 8px 0 0;
  color: var(--color-neutral-5);
  font-size: 11.5px;
  line-height: 1.5;
  text-align: center;
}

.ped-details-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
}

.ped-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--color-neutral-1);
}

.ped-detail-item + .ped-detail-item {
  border-top: 1px solid var(--color-card-stroke);
}

.ped-detail-label {
  font-size: 11px;
  color: var(--color-neutral-6);
}

.ped-detail-value {
  font-size: 12px;
  color: var(--color-neutral-9);
  font-weight: 500;
  text-align: right;
}

/* ── Content (Right) ── */
.ped-content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.ped-group {
  background: var(--color-neutral-1);
  border-radius: var(--radius-lg, 12px);
  padding: 16px;
  border: 1px solid var(--color-card-stroke);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ped-group-head {
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-9);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-card-stroke);
}

.ped-row {
  display: flex;
  gap: 14px;
}

.ped-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.ped-field-label {
  font-size: 11.5px;
  color: var(--color-neutral-7);
  font-weight: 500;
}

/* Standardized input without focus halos */
.ped-inp {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  font-size: 13.5px;
  color: var(--color-neutral-10);
  box-sizing: border-box;
  outline: none !important;
  box-shadow: none !important;
  transition: border-color var(--duration-fast, 150ms) var(--ease-breath);
}

.ped-inp:focus,
.ped-inp:focus-visible {
  outline: none !important;
  border-color: var(--color-accent);
  box-shadow: none !important;
}

.ped-inp::placeholder {
  color: var(--color-neutral-5);
}

.ped-field-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.ped-suggestion-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: var(--radius-sm, 4px);
  border: none;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  width: fit-content;
  transition: all var(--duration-fast, 150ms);
}

.ped-suggestion-btn:hover {
  background: var(--color-accent);
  color: #fff;
}

.ped-textarea {
  width: 100%;
  min-height: 76px;
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  color: var(--color-neutral-10);
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color var(--duration-fast, 150ms);
}

.ped-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: none;
}

.ped-divider {
  height: 1px;
  background: var(--color-card-stroke);
  margin: 4px 0;
}

/* ── Rel Rows ── */
.ped-rel-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 4px 0;
}

.ped-rel-row + .ped-rel-row {
  border-top: 1px dashed var(--color-card-stroke);
  padding-top: 10px;
}

.ped-rel-label {
  width: 36px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-9);
  padding-top: 4px;
}

.ped-rel-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ped-add-btn {
  font-size: 12px;
  color: var(--color-accent);
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 6px);
  transition: all var(--duration-fast, 150ms);
}

.ped-add-btn:hover {
  background: var(--color-accent-muted);
}

.ped-nil {
  font-size: 12px;
  color: var(--color-neutral-5);
  padding: 4px 0;
}

.ped-aux-btn {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  color: var(--color-neutral-7);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--duration-fast, 150ms);
}

.ped-aux-btn:hover {
  border-color: var(--color-neutral-5);
  background: var(--color-neutral-3);
  color: var(--color-neutral-10);
}

.ped-aux-btn--danger {
  color: var(--color-error);
}

.ped-aux-btn--danger:hover {
  background: var(--color-error-muted, rgba(239, 68, 68, 0.1));
  border-color: var(--color-error-muted);
}

/* ── Person Chips ── */
.ped-person-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--color-neutral-10);
  transition: all var(--duration-fast, 150ms);
}

.ped-person-chip:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.ped-person-chip--drag {
  cursor: grab;
}

.ped-person-chip--drag:active {
  cursor: grabbing;
}

.ped-drag-handle {
  display: inline-flex;
  align-items: center;
  color: var(--color-neutral-4);
  margin-right: -2px;
  cursor: grab;
}

.ped-person-chip--drag:hover .ped-drag-handle {
  color: var(--color-neutral-6);
}



.ped-person-avatar-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-neutral-3);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--color-neutral-7);
  flex-shrink: 0;
}

.ped-person-index-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-neutral-3);
  font-size: 9.5px;
  font-weight: 700;
  color: var(--color-neutral-6);
  flex-shrink: 0;
}

.ped-person-name {
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-drag-over {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.is-dragging {
  opacity: 0.5;
}

/* ── Chip buttons ── */
.ped-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ped-chip-btn {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  color: var(--color-neutral-8);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.ped-chip-btn:hover:not(:disabled) {
  border-color: var(--color-neutral-5);
  background: var(--color-neutral-3);
}

.ped-chip-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ped-chip-btn--accent {
  color: var(--color-accent);
  border-color: rgba(184, 51, 42, 0.25);
  background: var(--color-accent-muted);
  font-weight: 500;
}

.ped-chip-btn.is-active {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border-color: var(--color-accent);
}

/* ── Footer ── */
.ped-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 24px;
  border-top: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  flex-shrink: 0;
}

.ped-done-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 24px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.ped-done-btn:hover {
  filter: brightness(1.08);
}

/* ── Danger Zone ── */
.ped-danger-zone {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--color-card-stroke);
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.ped-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-error-muted, rgba(239, 68, 68, 0.2));
  background: var(--color-error-muted, rgba(239, 68, 68, 0.05));
  color: var(--color-error);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.ped-delete-btn:hover {
  background: var(--color-error);
  color: #fff;
}

/* ── Transition ── */
.ped-fade-enter-active,
.ped-fade-leave-active {
  transition: opacity 220ms var(--ease-breath);
}

.ped-fade-enter-from,
.ped-fade-leave-to {
  opacity: 0;
}

.ped-fade-enter-active .ped-card {
  animation: ped-scale-up 240ms var(--ease-breath) forwards;
}

.ped-fade-leave-active .ped-card {
  animation: ped-scale-down 160ms ease-in forwards;
}

@keyframes ped-scale-up {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes ped-scale-down {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .ped-card {
    width: 96vw;
    max-height: 94vh;
  }
  .ped-body {
    flex-direction: column;
  }
  .ped-sidebar {
    width: auto;
    border-right: none;
    border-bottom: 1px solid var(--color-card-stroke);
    padding: 16px;
  }
  .ped-content {
    padding: 16px;
  }
}
</style>
