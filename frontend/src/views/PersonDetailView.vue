<template>
  <div class="detail-page">
    <header class="detail-nav">
      <div class="detail-nav__left">
        <button class="nav-back" @click="goBack">Back to workbench</button>
        <div class="nav-breadcrumb">
          <span class="nav-link" @click="goToPublications">Guiyuan Archive</span>
          <span class="nav-sep">/</span>
          <span class="nav-current">{{ person?.name || 'Person Detail' }}</span>
        </div>
      </div>
      <div class="detail-nav__actions" v-if="person && !isEditing">
        <button class="btn-edit" @click="startEdit">Edit Profile</button>
      </div>
    </header>

    <div v-if="!person" class="error-state">Person not found</div>

    <main v-else class="detail-content">
      <section class="person-hero">
        <div class="hero-inner">
          <div class="person-avatar-frame">
            <div class="person-avatar" :class="genderClass(isEditing ? (editForm.gender as Gender) : person.gender)">
              <img v-if="person.avatarUrl" :src="photoUrl(person.avatarUrl)" :alt="person.name" />
              <span v-else class="avatar-text">{{ (isEditing ? editForm.name : person.name)?.slice(-1) || '?' }}</span>
            </div>
          </div>

          <div v-if="!isEditing" class="hero-info">
            <h1 class="hero-name">{{ person.name }}</h1>
            <div class="hero-dates">{{ person.birth || '?' }} - {{ person.death || (person.deceased ? '?' : 'Present') }}</div>
            <div class="hero-badges">
              <span class="gender-badge" :class="genderClass(person.gender)">{{ person.gender === 'male' ? 'Male' : person.gender === 'female' ? 'Female' : 'Unknown' }}</span>
              <span class="status-badge">{{ person.deceased ? 'Deceased' : 'Living' }}</span>
            </div>
            <div class="hero-sub" v-if="person.titleName || person.clan">
              <div v-if="person.titleName" class="sub-item">Title: {{ person.titleName }}</div>
              <div v-if="person.clan" class="sub-item">Clan: {{ person.clan }}</div>
            </div>
          </div>

          <div v-else class="person-info person-info--form">
            <div class="edit-form-grid">
              <div class="form-row">
                <div class="field">
                  <label>Name</label>
                  <input v-model="editForm.name" type="text" />
                </div>
                <div class="field">
                  <label>Gender</label>
                  <select v-model="editForm.gender">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div class="field field--checkbox">
                  <label>
                    <input v-model="editForm.deceased" type="checkbox" />
                    Deceased
                  </label>
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Birth</label>
                  <input v-model="editForm.birth" type="text" />
                </div>
                <div class="field">
                  <label>Death</label>
                  <input v-model="editForm.death" type="text" />
                </div>
                <div class="field">
                  <label>Age</label>
                  <input v-model="editForm.age" type="text" />
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Title</label>
                  <input v-model="editForm.titleName" type="text" />
                </div>
                <div class="field">
                  <label>Clan</label>
                  <input v-model="editForm.clan" type="text" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="bio-card card">
        <h2 class="section-title">Biography</h2>
        <div v-if="!isEditing" class="note-content" :class="{ 'note-content--empty': !person.note }">
          <template v-if="person.note">{{ person.note }}</template>
          <template v-else>No biography available.</template>
        </div>
        <div v-else class="field field--full">
          <textarea v-model="editForm.note" rows="16"></textarea>
        </div>
      </section>

      <div v-if="isEditing" class="floating-actions">
        <div class="floating-actions__content">
          <span class="editing-label">Editing person details...</span>
          <div class="floating-actions__btns">
            <button class="btn-cancel" :disabled="isSaving" @click="cancelEdit">Cancel</button>
            <button class="btn-save" :disabled="isSaving" @click="handleSave">{{ isSaving ? 'Saving...' : 'Save and Sync' }}</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Gender, Person } from '../types/family'

const props = defineProps<{
  publicationId: number
  personId: string
}>()

const router = useRouter()
const { pub, saveToServer, history } = inject('publication-context') as any
const pubData = computed(() => pub.publication)

const isSaving = ref(false)
const isEditing = ref(false)
const editForm = ref<Partial<Person>>({})

const person = computed<Person | null>(() => {
  if (!pubData.value) return null
  return pubData.value.people[props.personId] ?? null
})

function genderClass(gender: Gender): string {
  if (gender === 'male') return 'gender-male'
  if (gender === 'female') return 'gender-female'
  return 'gender-unknown'
}

function photoUrl(avatarUrl?: string): string {
  return avatarUrl || ''
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
    Object.assign(pub.publication.people[props.personId], editForm.value)
    await saveToServer()
    history.markHistory('Edit person detail')
    isEditing.value = false
  } catch (err: any) {
    alert(`Save failed: ${err?.message || 'Unknown error'}`)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg-shell, #efe3cf);
}

.detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 56px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(169, 110, 53, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.detail-nav__left,
.nav-breadcrumb,
.hero-badges,
.form-row,
.floating-actions__btns {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-back,
.btn-edit,
.btn-save,
.btn-cancel {
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}

.nav-back,
.btn-cancel {
  background: transparent;
}

.btn-edit,
.btn-save {
  background: var(--accent-amber, #a96e35);
  color: #fff;
}

.detail-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px 80px;
}

.person-hero,
.card {
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(169, 110, 53, 0.1);
  padding: 24px;
  margin-bottom: 24px;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.person-avatar-frame {
  padding: 8px;
  border-radius: 20px;
  background: linear-gradient(135deg, #a96e35, #6a4b2f);
}

.person-avatar {
  width: 140px;
  height: 140px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(169, 110, 53, 0.08);
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  font-size: 3rem;
  color: #fff;
}

.hero-info,
.person-info--form {
  width: 100%;
}

.hero-name,
.section-title {
  font-family: 'Noto Serif SC', serif;
}

.edit-form-grid,
.field,
.floating-actions,
.floating-actions__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.note-content--empty {
  color: #777;
}

.floating-actions {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.floating-actions__content {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 110, 53, 0.15);
  border-radius: 18px;
  padding: 16px 20px;
}
</style>
