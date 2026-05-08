<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Person, Gender } from '../types/family'

const props = defineProps<{
  publicationId: number
  personId: string
}>()

const router = useRouter()

// ─── Shared Context ─────────────────────────────────────────────
const { pub, saveToServer, history } = inject('publication-context') as any
const pubData = computed(() => pub.publication)

const isSaving = ref(false)
const isEditing = ref(false)
const editForm = ref<Partial<Person>>({})

const person = computed<Person | null>(() => {
  if (!pubData.value) return null
  return pubData.value.people[props.personId] ?? null
})

function genderClass(g: Gender): string {
  if (g === 'male') return 'gender-male'
  if (g === 'female') return 'gender-female'
  return 'gender-unknown'
}

function photoUrl(avatarUrl?: string): string {
  if (!avatarUrl) return ''
  return avatarUrl
}

function goBack() {
  router.push({ name: 'workbench' })
}

function goToPublications() {
  router.push({ name: 'publications' })
}

function startEdit() {
  if (!person.value) return
  editForm.value = { ...person.value }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

async function handleSave() {
  if (!person.value) return
  isSaving.value = true
  try {
    // Push editForm changes into reactive state (triggers watcher-based auto-save)
    Object.assign(pub.publication.people[props.personId], editForm.value)

    // Save immediately to server (the watcher debounce also picks this up,
    // but deduplication in saveToServer prevents double-save issues)
    await saveToServer()
    history.markHistory('修改人物详情')

    isEditing.value = false
  } catch (err: any) {
    alert('保存失败: ' + (err.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="detail-page">
    <!-- Top Navigation -->
    <header class="detail-nav">
      <div class="detail-nav__left">
        <button class="nav-back" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          返回工作台
        </button>
        <div class="nav-breadcrumb">
          <span class="nav-link" @click="goToPublications">族谱管理</span>
          <span class="nav-sep">/</span>
          <span class="nav-current">{{ person?.name || '人物详情' }}</span>
        </div>
      </div>
      <div class="detail-nav__actions" v-if="person && !isEditing">
        <button class="btn-edit" @click="startEdit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          编辑资料
        </button>
      </div>
    </header>

    <div v-if="!person" class="error-state">未找到该人物</div>

    <main v-else class="detail-content">
      <!-- Floating Action Bar (Only visible when editing) -->
      <Transition name="slide-up">
        <div v-if="isEditing" class="floating-actions">
          <div class="floating-actions__content">
            <span class="editing-label">正在编辑生平资料...</span>
            <div class="floating-actions__btns">
              <button class="btn-cancel" :disabled="isSaving" @click="cancelEdit">取消</button>
              <button class="btn-save" :disabled="isSaving" @click="handleSave">
                {{ isSaving ? '保存中...' : '保存并同步' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <div class="biography-scroll">
        <!-- Center Column -->
        <div class="biography-container">
          <!-- Person Hero -->
          <section class="person-hero" :class="{ 'person-hero--deceased': person.deceased, 'person-hero--editing': isEditing }">
            <div class="hero-inner">
              <div class="person-avatar-frame octagonal-frame">
                <div class="person-avatar octagonal-clip" :class="genderClass(isEditing ? (editForm.gender as Gender) : person.gender)">
                  <img v-if="person.avatarUrl" :src="photoUrl(person.avatarUrl)" :alt="person.name" />
                  <span v-else class="avatar-text">{{ (isEditing ? editForm.name : person.name)?.slice(-1) || '?' }}</span>
                </div>
              </div>
              
              <div v-if="!isEditing" class="hero-info">
                <h1 class="hero-name">{{ person.name }}</h1>
                <div class="hero-dates">
                  {{ person.birth || '?' }} — {{ person.death || (person.deceased ? '?' : '至今') }}
                </div>
                <div class="hero-badges">
                  <span class="gender-badge" :class="genderClass(person.gender)">
                    {{ person.gender === 'male' ? '♂ 男' : person.gender === 'female' ? '♀ 女' : '○ 未知' }}
                  </span>
                  <span v-if="person.deceased" class="vermilion-seal seal--deceased">已故</span>
                  <span v-else class="vermilion-seal seal--alive">在世</span>
                </div>
                <div v-if="person.titleName || person.clan" class="hero-sub">
                  <div v-if="person.titleName" class="sub-item">字/号：{{ person.titleName }}</div>
                  <div v-if="person.clan" class="sub-item">堂号：{{ person.clan }}</div>
                </div>
              </div>

              <div v-else class="person-info person-info--form">
                <div class="edit-form-grid">
                  <div class="form-section">
                    <h3 class="form-section-title">核心信息</h3>
                    <div class="form-row">
                      <div class="field field--name">
                        <label>姓名</label>
                        <input v-model="editForm.name" type="text" placeholder="请输入姓名" />
                      </div>
                      <div class="field field--gender">
                        <label>性别</label>
                        <select v-model="editForm.gender">
                          <option value="male">男</option>
                          <option value="female">女</option>
                          <option value="unknown">未知</option>
                        </select>
                      </div>
                      <div class="field field--deceased">
                        <label>生死状态</label>
                        <div class="checkbox-group">
                          <input type="checkbox" id="deceased-check" v-model="editForm.deceased" />
                          <label for="deceased-check">已故</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="form-section">
                    <h3 class="form-section-title">身份与日期</h3>
                    <div class="form-row">
                      <div class="field">
                        <label>字/号/讳</label>
                        <input v-model="editForm.titleName" type="text" placeholder="例：东坡居士" />
                      </div>
                      <div class="field">
                        <label>堂号/氏</label>
                        <input v-model="editForm.clan" type="text" placeholder="例：陇西李氏" />
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="field">
                        <label>出生日期</label>
                        <input v-model="editForm.birth" type="text" placeholder="例：1921年十月初二" />
                      </div>
                      <div class="field" v-if="editForm.deceased">
                        <label>去世日期</label>
                        <input v-model="editForm.death" type="text" placeholder="例：2008年腊月" />
                      </div>
                      <div class="field">
                        <label>享年/岁数</label>
                        <input v-model="editForm.age" type="text" placeholder="例：87 岁" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Biography Content -->
          <section class="bio-card card">
            <h2 class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              个人传记
            </h2>
            <div v-if="!isEditing" class="note-content" :class="{ 'note-content--empty': !person.note }">
              <template v-if="person.note">
                <span class="drop-cap">{{ person.note.charAt(0) }}</span>
                {{ person.note.slice(1) }}
              </template>
              <template v-else>
                <div class="empty-note">
                  <p>在此铭刻先辈生平...</p>
                  <span>点击右上角“编辑资料”开始撰写传记</span>
                </div>
              </template>
              <div class="scroll-ornament scroll-ornament--top"></div>
              <div class="scroll-ornament scroll-ornament--bottom"></div>
            </div>
            <div v-else class="field field--full">
              <textarea v-model="editForm.note" rows="20" placeholder="在此输入人物的生平事迹、重要成就、家族迁徙等详细传记..."></textarea>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg-shell, #efe3cf);
}

/* ── Nav ── */
.detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 56px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(169, 110, 53, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.detail-nav__left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: var(--text-sub, #555);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-back:hover {
  background: rgba(169, 110, 53, 0.05);
  color: var(--accent-amber);
}

.nav-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.nav-link {
  color: var(--text-soft, #888);
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover { color: var(--accent-amber); }

.nav-current {
  color: var(--text-main, #1a1a1a);
  font-weight: 700;
}

.btn-edit {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--accent-amber);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(169, 110, 53, 0.2);
}

/* ── Layout ── */
.detail-content {
  padding: 3rem 1rem;
}

.biography-container {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  animation: tl-fade-in 0.8s ease-out;
}

@keyframes tl-fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  background: var(--bg-panel, #fff);
  border-radius: 24px;
  border: 1px solid rgba(169, 110, 53, 0.1);
  box-shadow: 0 10px 40px rgba(106, 75, 47, 0.05);
  padding: 2.5rem;
}

/* ── Hero ── */
.person-hero {
  padding: 3rem 2rem;
  text-align: center;
  background: #fff;
  border-radius: 32px;
  border: 1px solid rgba(169, 110, 53, 0.1);
  position: relative;
  overflow: hidden;
}

.person-hero--deceased {
  filter: grayscale(0.2) sepia(0.2);
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.octagonal-frame {
  padding: 10px;
  background: linear-gradient(135deg, var(--accent-amber, #a96e35), #6a4b2f);
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
}

.octagonal-clip {
  width: 160px;
  height: 160px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: rgba(169, 110, 53, 0.05);
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.avatar-text { font-size: 3.5rem; color: #fff; font-weight: 700; }

.hero-name {
  font-size: 2.8rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 900;
  margin: 0;
  color: var(--accent-ink);
}

.hero-dates {
  font-size: 1.1rem;
  color: var(--text-soft);
  letter-spacing: 0.2em;
  margin-top: 0.5rem;
}

.hero-badges {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.gender-badge {
  padding: 0.4rem 1.2rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  border: 1px solid rgba(169, 110, 53, 0.2);
  color: var(--accent-ink);
}

.vermilion-seal {
  writing-mode: vertical-rl;
  border: 2px solid #b22222;
  color: #b22222;
  padding: 4px;
  font-size: 1rem;
  font-weight: 900;
  background: rgba(178, 34, 34, 0.02);
}

/* ── Biography ── */
.note-content {
  font-size: 1.25rem;
  line-height: 2.2;
  color: #2a2a2a;
  padding: 4rem;
  background: var(--bg-shell, #efe3cf);
  border: 1px solid #d4c4a8;
  border-radius: 4px;
  position: relative;
  font-family: 'Noto Serif SC', serif;
  white-space: pre-wrap;
}

.drop-cap {
  float: left;
  font-size: 5rem;
  line-height: 1;
  padding-right: 0.8rem;
  font-weight: 900;
  color: #b22222;
}

.note-content--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
}

.empty-note {
  text-align: center;
  color: var(--text-soft);
  opacity: 0.7;
}

.empty-note p {
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
  font-family: 'Noto Serif SC', serif;
}

.empty-note span {
  font-size: 0.9rem;
}

/* ── Form ── */
.edit-form-grid { display: flex; flex-direction: column; gap: 2rem; text-align: left; }
.form-row { display: flex; gap: 1.5rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
.field label { font-size: 0.8rem; font-weight: 700; color: var(--text-soft); }
.field input, .field select {
  padding: 0.8rem 0;
  border: none;
  border-bottom: 2px solid rgba(169, 110, 53, 0.1);
  background: transparent;
  font-size: 1.1rem;
  outline: none;
  transition: border-color 0.3s;
}
.field input:focus { border-bottom-color: var(--accent-amber); }
.field textarea {
  width: 100%;
  border: 1px solid rgba(169, 110, 53, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.5);
  font-size: 1.1rem;
  line-height: 1.8;
  outline: none;
}

/* ── Floating Actions ── */
.floating-actions {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
.floating-actions__content {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  padding: 0.8rem 2rem;
  border-radius: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 2rem;
  border: 1px solid rgba(169, 110, 53, 0.15);
}
.btn-save {
  padding: 0.6rem 1.5rem;
  background: var(--accent-amber);
  color: #fff;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  cursor: pointer;
}
.btn-cancel {
  background: none;
  border: none;
  color: var(--text-soft);
  cursor: pointer;
  font-weight: 600;
}

.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 100%); opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s ease; }

@media (max-width: 768px) {
  .biography-container { padding: 0 1rem; }
  .hero-name { font-size: 2rem; }
  .form-row { flex-direction: column; }
  .note-content { padding: 2rem; font-size: 1.1rem; }
}
</style>
