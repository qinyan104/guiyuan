<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PublicationData } from '../types/family'
import { resolveKinshipTerm } from '../lib/kinship'

const props = defineProps<{
  publication: PublicationData
  egoPersonId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

// ─── State ──────────────────────────────────────────────────

const selectedA = ref(props.egoPersonId ?? '')
const selectedB = ref('')
const searchA = ref('')
const searchB = ref('')

// ─── Person list ────────────────────────────────────────────

const people = computed(() => {
  return Object.entries(props.publication.people).map(([id, person]) => ({
    id,
    name: person.name,
    gender: person.gender,
  }))
})

function filterPeople(search: string) {
  if (!search.trim()) return people.value
  const q = search.trim().toLowerCase()
  return people.value.filter((p) => p.name.toLowerCase().includes(q))
}

const filteredA = computed(() => filterPeople(searchA.value))
const filteredB = computed(() => filterPeople(searchB.value))

// ─── Result ─────────────────────────────────────────────────

const result = computed(() => {
  if (!selectedA.value || !selectedB.value) return null
  if (selectedA.value === selectedB.value) {
    const p = props.publication.people[selectedA.value]
    return { term: '本人', description: p?.name ?? '', generationGap: 0, isElder: false }
  }
  return resolveKinshipTerm(props.publication, selectedA.value, selectedB.value)
})

function personName(id: string): string {
  return props.publication.people[id]?.name ?? '未知'
}

function swap() {
  const tmp = selectedA.value
  selectedA.value = selectedB.value
  selectedB.value = tmp
}
</script>

<template>
  <div class="kinship-overlay" @click.self="emit('close')">
    <div class="kinship-dialog">
      <div class="dialog-header">
        <h3>推算亲戚关系</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="dialog-body">
        <!-- Person selectors -->
        <div class="selector-row">
          <div class="selector">
            <label>人物 A</label>
            <input
              v-model="searchA"
              placeholder="搜索姓名..."
              class="person-input"
            />
            <div v-if="searchA.trim()" class="dropdown">
              <button
                v-for="p in filteredA"
                :key="p.id"
                class="dropdown-item"
                :class="{ active: selectedA === p.id }"
                @click="selectedA = p.id; searchA = ''"
              >
                {{ p.name }}
              </button>
              <div v-if="filteredA.length === 0" class="dropdown-empty">无结果</div>
            </div>
          </div>

          <button class="swap-btn" @click="swap" title="交换 A/B">⇄</button>

          <div class="selector">
            <label>人物 B</label>
            <input
              v-model="searchB"
              placeholder="搜索姓名..."
              class="person-input"
            />
            <div v-if="searchB.trim()" class="dropdown">
              <button
                v-for="p in filteredB"
                :key="p.id"
                class="dropdown-item"
                :class="{ active: selectedB === p.id }"
                @click="selectedB = p.id; searchB = ''"
              >
                {{ p.name }}
              </button>
              <div v-if="filteredB.length === 0" class="dropdown-empty">无结果</div>
            </div>
          </div>
        </div>

        <!-- Selected display -->
        <div v-if="selectedA && selectedB" class="selected-display">
          <span class="person-tag">{{ personName(selectedA) }}</span>
          <span class="relation-arrow">→</span>
          <span class="person-tag">{{ personName(selectedB) }}</span>
        </div>

        <!-- Result -->
        <div v-if="result" class="result-area">
          <div class="result-term">{{ result.term }}</div>
          <div class="result-desc">{{ result.description }}</div>
          <div class="result-meta">
            <span>辈分差: {{ result.generationGap > 0 ? `小${result.generationGap}辈` : result.generationGap < 0 ? `大${Math.abs(result.generationGap)}辈` : '同辈' }}</span>
            <span>{{ result.isElder ? '长辈' : result.term === '本人' ? '' : '晚辈' }}</span>
          </div>
        </div>
        <div v-else-if="selectedA && selectedB" class="result-area no-relation">
          未找到共同祖先，暂无法推算关系
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kinship-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.kinship-dialog {
  background: var(--card, #fff);
  border-radius: var(--radius, 12px);
  width: 460px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--muted-foreground, #6b7280);
}

.close-btn:hover {
  background: var(--muted, #f3f4f6);
}

.dialog-body {
  padding: 20px;
}

.selector-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.selector {
  flex: 1;
  position: relative;
}

.selector label {
  display: block;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  margin-bottom: 4px;
}

.person-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--radius, 6px);
  font-size: 14px;
  background: var(--background, #fff);
  color: var(--foreground, #111);
  box-sizing: border-box;
}

.person-input:focus {
  outline: none;
  border-color: var(--primary, #3b82f6);
  box-shadow: 0 0 0 2px var(--primary-alpha, rgba(59, 130, 246, 0.2));
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card, #fff);
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--radius, 6px);
  max-height: 180px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: var(--foreground, #111);
}

.dropdown-item:hover,
.dropdown-item.active {
  background: var(--muted, #f3f4f6);
}

.dropdown-empty {
  padding: 12px;
  text-align: center;
  color: var(--muted-foreground, #6b7280);
  font-size: 13px;
}

.swap-btn {
  flex-shrink: 0;
  margin-top: 20px;
  padding: 6px 10px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--radius, 6px);
  background: var(--background, #fff);
  cursor: pointer;
  font-size: 16px;
  color: var(--muted-foreground, #6b7280);
}

.swap-btn:hover {
  background: var(--muted, #f3f4f6);
}

.selected-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  margin-bottom: 16px;
}

.person-tag {
  padding: 6px 14px;
  background: var(--muted, #f3f4f6);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.relation-arrow {
  color: var(--muted-foreground, #6b7280);
  font-size: 18px;
}

.result-area {
  text-align: center;
  padding: 24px 0;
}

.result-term {
  font-size: 36px;
  font-weight: 700;
  color: var(--foreground, #111);
  margin-bottom: 8px;
}

.result-desc {
  font-size: 14px;
  color: var(--muted-foreground, #6b7280);
  margin-bottom: 12px;
}

.result-meta {
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 12px;
  color: var(--muted-foreground, #9ca3af);
}

.no-relation {
  color: var(--muted-foreground, #6b7280);
  font-size: 14px;
}
</style>
