<script setup lang="ts">
import { ref, computed } from "vue"
import type { PublicationData, Person } from "../types/family"
import { resolveKinshipTermExtended, findRelationshipPathExtended } from "../lib/kinship"
import type { KinshipPath } from "../lib/kinship"

const props = defineProps<{
  publication: PublicationData
  egoPersonId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const selectedA = ref('')
const selectedB = ref("")
const searchA = ref("")
const searchB = ref("")
const showDropdownA = ref(false)
const showDropdownB = ref(false)

const people = computed(() => {
  return Object.entries(props.publication.people).map(([id, person]) => ({
    id,
    name: person.name,
    gender: person.gender,
    birth: person.birth,
    death: person.death,
    age: person.age,
    clan: person.clan,
  }))
})

function filterPeople(search: string) {
  if (!search.trim()) return people.value
  const q = search.trim().toLowerCase()
  return people.value.filter((p) => p.name.toLowerCase().includes(q))
}

const filteredA = computed(() => filterPeople(searchA.value))
const filteredB = computed(() => filterPeople(searchB.value))

function personById(id: string): Person | undefined {
  return props.publication.people[id]
}

const result = computed(() => {
  if (!selectedA.value || !selectedB.value) return null
  if (selectedA.value === selectedB.value) {
    const p = props.publication.people[selectedA.value]
    return { term: "本人", description: p?.name ?? "", generationGap: 0, isElder: false }
  }
  return resolveKinshipTermExtended(props.publication, selectedA.value, selectedB.value)
})

interface ExtendedPath {
  isInLaw: boolean
  bloodPath?: KinshipPath
  inLawPath?: { path: string[]; spousesUsed: string[]; commonAncestorId?: string }
}

const relationshipPath = computed<ExtendedPath | null>(() => {
  if (!selectedA.value || !selectedB.value || selectedA.value === selectedB.value) return null
  const result = findRelationshipPathExtended(props.publication, selectedA.value, selectedB.value)
  if (!result) return null
  return {
    isInLaw: result.isInLaw,
    bloodPath: result.bloodPath,
    inLawPath: result.inLawPath,
  }
})

function swap() {
  const tmp = selectedA.value
  selectedA.value = selectedB.value
  selectedB.value = tmp
}

function extractYear(birthStr?: string): number | null {
  if (!birthStr) return null
  const match = birthStr.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : null
}

const ageComparison = computed(() => {
  const a = personById(selectedA.value)
  const b = personById(selectedB.value)
  const ya = extractYear(a?.birth)
  const yb = extractYear(b?.birth)
  if (ya !== null && yb !== null) {
    if (ya < yb) return { older: "A", diff: yb - ya }
    if (yb < ya) return { older: "B", diff: ya - yb }
  }
  return null
})

const pathNodes = computed(() => {
  const p = relationshipPath.value
  if (!p) return []
  const bp = p.bloodPath
  const ip = p.inLawPath
  if (bp) {
    return bp.path.map((id) => ({
      id,
      person: personById(id),
      isEndpoint: id === selectedA.value || id === selectedB.value,
      isAncestor: id === bp.commonAncestorId,
      isA: id === selectedA.value,
      isB: id === selectedB.value,
      isSpouse: false,
    }))
  }
  if (ip) {
    const spouseSet = new Set(ip.spousesUsed)
    return ip.path.map((id, idx) => ({
      id,
      person: personById(id),
      isEndpoint: id === selectedA.value || id === selectedB.value,
      isAncestor: false,
      isA: id === selectedA.value,
      isB: id === selectedB.value,
      isSpouse: spouseSet.has(id),
    }))
  }
  return []
})

const pathDescription = computed(() => {
  const p = relationshipPath.value
  if (!p) return ""
  const aName = personById(selectedA.value)?.name ?? "未知"
  const bName = personById(selectedB.value)?.name ?? "未知"

  const bp = p.bloodPath
  const ip = p.inLawPath

  if (bp) {
    const ancestor = personById(bp.commonAncestorId)
    const ancName = ancestor?.name ?? "未知"
    const upIds = bp.path.slice(1, bp.path.indexOf(bp.commonAncestorId))
    const downIds = bp.path.slice(bp.path.indexOf(bp.commonAncestorId) + 1, -1)

    if (bp.upSteps === 0) {
      return `${bName} 是 ${aName} 的直系后代`
    }
    if (bp.downSteps === 0) {
      return `${aName} 是 ${bName} 的直系后代`
    }

    let desc = `${aName}`
    const upNames = upIds.map((id) => personById(id)?.name ?? "未知").join(", ")
    const downNames = downIds.map((id) => personById(id)?.name ?? "未知").join(", ")
    if (upNames) desc += ` -> ${upNames}`
    desc += ` -> ${ancName}(共同祖先)`
    if (downNames) desc += ` -> ${downNames}`
    desc += ` -> ${bName}`
    return desc
  }

  if (ip) {
    const pathNames = ip.path.map((id) => {
      const p = personById(id)
      const name = p?.name ?? "未知"
      if (ip.spousesUsed.includes(id)) return `${name}(配偶)`
      return name
    }).join(" -> ")
    return `${aName} 与 ${bName} 通过姻亲关系相连: ${pathNames}`
  }

  return ""
})

function selectPersonA(id: string) {
  selectedA.value = id
  searchA.value = ""
  showDropdownA.value = false
}

function selectPersonB(id: string) {
  selectedB.value = id
  searchB.value = ""
  showDropdownB.value = false
}

function genderLabel(g: string): string {
  if (g === "male") return "男"
  if (g === "female") return "女"
  return ""
}

function avatarLetter(name: string): string {
  return name?.charAt(0) ?? "?"
}
</script>
<template>
  <Teleport to="body">
  <Transition name="kinship-fade">
    <div class="kinship-overlay" @click.self="emit('close')">
      <div
        class="kinship-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="亲属关系计算器"
        @keydown.escape="emit('close')"
      >
        <div class="kinship-dialog__header">
          <div class="kinship-dialog__title">
            <p>称谓推算</p>
            <h2>亲属关系</h2>
            <span>选择称呼者与被称呼者，查看族谱中的准确称谓。</span>
          </div>
          <button class="kinship-dialog__close" type="button" @click="emit('close')" aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        <div class="kinship-dialog__body">
          <!-- Person Selectors -->
          <div class="kinship-selectors">
            <!-- Person A -->
            <div class="kinship-selector" :class="{ 'kinship-selector--selected': !!selectedA }">
              <span class="kinship-selector__label">称呼者</span>
              <template v-if="!selectedA">
                <div class="kinship-selector__search">
                  <svg class="kinship-selector__search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                    <circle cx="7" cy="7" r="4" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
                  </svg>
                  <input
                    v-model="searchA"
                    placeholder="搜索姓名..."
                    class="kinship-selector__input"
                    @focus="showDropdownA = true"
                    @blur="showDropdownA = false"
                  />
                </div>
                <div v-if="searchA.trim() && showDropdownA" class="kinship-dropdown">
                  <button
                    v-for="p in filteredA" :key="p.id"
                    class="kinship-dropdown__item"
                    @mousedown.prevent="selectPersonA(p.id)"
                  >
                    <span class="kinship-dropdown__avatar" :class="p.gender === 'female' ? 'avatar--female' : 'avatar--male'">
                      {{ avatarLetter(p.name) }}
                    </span>
                    <span class="kinship-dropdown__info">
                      <span class="kinship-dropdown__name">{{ p.name }}</span>
                      <span class="kinship-dropdown__meta">{{ genderLabel(p.gender) }}<template v-if="p.birth"> · {{ extractYear(p.birth) }}</template></span>
                    </span>
                  </button>
                  <div v-if="filteredA.length === 0" class="kinship-dropdown__empty">无结果</div>
                </div>
              </template>
              <template v-else>
                <div class="kinship-selected-person" @click="selectedA = ''; searchA = ''">
                  <span class="kinship-selected-person__avatar" :class="personById(selectedA)?.gender === 'female' ? 'avatar--female' : 'avatar--male'">
                    {{ avatarLetter(personById(selectedA)?.name ?? '?') }}
                  </span>
                  <span class="kinship-selected-person__info">
                    <span class="kinship-selected-person__name">{{ personById(selectedA)?.name }}</span>
                    <span class="kinship-selected-person__meta">
                      {{ genderLabel(personById(selectedA)?.gender ?? 'unknown') }}
                      <template v-if="personById(selectedA)?.birth"> · {{ personById(selectedA)?.birth }}</template>
                    </span>
                  </span>
                </div>
              </template>
            </div>

            <!-- Swap Button -->
            <button class="kinship-swap" type="button" @click="swap" title="交换 A/B">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="7 17 3 13 7 9" /><polyline points="17 7 21 11 17 15" />
                <line x1="3" y1="13" x2="21" y2="13" /><line x1="21" y1="11" x2="3" y2="11" />
              </svg>
            </button>

            <!-- Person B -->
            <div class="kinship-selector" :class="{ 'kinship-selector--selected': !!selectedB }">
              <span class="kinship-selector__label">被称呼者</span>
              <template v-if="!selectedB">
                <div class="kinship-selector__search">
                  <svg class="kinship-selector__search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                    <circle cx="7" cy="7" r="4" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
                  </svg>
                  <input
                    v-model="searchB"
                    placeholder="搜索姓名..."
                    class="kinship-selector__input"
                    @focus="showDropdownB = true"
                    @blur="showDropdownB = false"
                  />
                </div>
                <div v-if="searchB.trim() && showDropdownB" class="kinship-dropdown">
                  <button
                    v-for="p in filteredB" :key="p.id"
                    class="kinship-dropdown__item"
                    @mousedown.prevent="selectPersonB(p.id)"
                  >
                    <span class="kinship-dropdown__avatar" :class="p.gender === 'female' ? 'avatar--female' : 'avatar--male'">
                      {{ avatarLetter(p.name) }}
                    </span>
                    <span class="kinship-dropdown__info">
                      <span class="kinship-dropdown__name">{{ p.name }}</span>
                      <span class="kinship-dropdown__meta">{{ genderLabel(p.gender) }}<template v-if="p.birth"> · {{ extractYear(p.birth) }}</template></span>
                    </span>
                  </button>
                  <div v-if="filteredB.length === 0" class="kinship-dropdown__empty">无结果</div>
                </div>
              </template>
              <template v-else>
                <div class="kinship-selected-person" @click="selectedB = ''; searchB = ''">
                  <span class="kinship-selected-person__avatar" :class="personById(selectedB)?.gender === 'female' ? 'avatar--female' : 'avatar--male'">
                    {{ avatarLetter(personById(selectedB)?.name ?? '?') }}
                  </span>
                  <span class="kinship-selected-person__info">
                    <span class="kinship-selected-person__name">{{ personById(selectedB)?.name }}</span>
                    <span class="kinship-selected-person__meta">
                      {{ genderLabel(personById(selectedB)?.gender ?? 'unknown') }}
                      <template v-if="personById(selectedB)?.birth"> · {{ personById(selectedB)?.birth }}</template>
                    </span>
                  </span>
                </div>
              </template>
            </div>
          </div>

          <!-- Relationship Path Chain -->
          <div v-if="selectedA && selectedB && pathNodes.length > 0" class="kinship-path-section">
            <div class="kinship-path-section__label">关系路径</div>
            <div class="kinship-path-chain">
              <template v-for="(node, idx) in pathNodes" :key="node.id">
                <div class="kinship-path-node" :class="{ 'kinship-path-node--endpoint': node.isEndpoint, 'kinship-path-node--ancestor': node.isAncestor }">
                  <span class="kinship-path-node__avatar" :class="node.person?.gender === 'female' ? 'avatar--female' : 'avatar--male'">
                    {{ avatarLetter(node.person?.name ?? '?') }}
                  </span>
                  <span class="kinship-path-node__name">{{ node.person?.name }}</span>
                  <span v-if="node.isA" class="kinship-path-node__tag kinship-path-node__tag--a">A</span>
                  <span v-else-if="node.isB" class="kinship-path-node__tag kinship-path-node__tag--b">B</span>
                  <span v-else-if="node.isAncestor" class="kinship-path-node__tag kinship-path-node__tag--ancestor">共同祖先</span>
                </div>
                <div v-if="idx < pathNodes.length - 1" class="kinship-path-edge">
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="kinship-path-edge__arrow">
                    <path d="M2 6h10M10 2l4 4-4 4" />
                  </svg>
                </div>
              </template>
            </div>
            <p v-if="pathDescription" class="kinship-path-desc">{{ pathDescription }}</p>
          </div>

          <!-- Result -->
          <div v-if="selectedA && selectedB && result" class="kinship-result">
            <div class="kinship-result__term">{{ result.term }}</div>
            <div v-if="result.description" class="kinship-result__desc">{{ result.description }}</div>

            <div class="kinship-result__chips">
              <span v-if="relationshipPath?.bloodPath?.commonAncestorId" class="kinship-chip">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2"/></svg>
                共同祖先：{{ personById(relationshipPath.bloodPath.commonAncestorId)?.name ?? '未知' }}
              </span>
              <span v-if="ageComparison" class="kinship-chip">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="8 2 8 8 12 10"/></svg>
                {{ ageComparison.older === 'A' ? personById(selectedA)?.name : personById(selectedB)?.name }} 年长 {{ ageComparison.diff }} 岁
              </span>
              <span v-if="relationshipPath" class="kinship-chip">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="14" height="12" rx="2"/><line x1="5" y1="2" x2="5" y2="14"/></svg>
                {{ relationshipPath.bloodPath?.isPatrilineal ? '父系' : '母系' }}亲属 · {{ result.generationGap === 0 ? '同辈' : Math.abs(result.generationGap) + '代差' }}
              </span>
            </div>
          </div>

          <!-- No Relationship Found -->
          <div v-if="selectedA && selectedB && !result" class="kinship-empty">
            <div class="kinship-empty__icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                <circle cx="24" cy="24" r="20"/><line x1="24" y1="16" x2="24" y2="28"/><circle cx="24" cy="32" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <p>未找到这两位族人之间的关系</p>
            <span>他们可能来自不同的家族分支，暂时没有血缘或姻亲关联</span>
          </div>

          <!-- Empty State -->
          <div v-if="!selectedA || !selectedB" class="kinship-empty">
            <div class="kinship-empty__icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                <circle cx="18" cy="14" r="6"/><circle cx="30" cy="14" r="6"/>
                <path d="M6 40c0-8 5-14 12-14s12 6 12 14M18 40c0-8 6-14 12-14s12 6 12 14"/>
              </svg>
            </div>
            <p>选择两位族人，查看他们之间的亲戚关系</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  </Teleport>
</template>
<style scoped>
/* ── Overlay & Dialog ── */
.kinship-overlay {
  position: fixed; inset: 0;
  background: color-mix(in srgb, var(--color-overlay) 82%, transparent);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: var(--z-overlay);
  padding: 24px;
}

.kinship-dialog {
  width: min(760px, 100%);
  max-height: min(760px, calc(100dvh - 48px));
  background: var(--bg-panel-strong, #fefcf7);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-float);
  overflow: auto;
}

/* ── Header ── */
.kinship-dialog__header {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 22px 24px 18px;
  background: color-mix(in srgb, var(--bg-panel-strong, #fefcf7) 94%, transparent);
  border-bottom: 1px solid var(--color-card-stroke);
  backdrop-filter: blur(16px);
}

.kinship-dialog__title {
  display: grid;
  gap: 3px;
}

.kinship-dialog__title p {
  margin: 0;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.kinship-dialog__title h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 24px; font-weight: 600;
  color: var(--text-main, #3a3229);
  letter-spacing: 0.03em;
}

.kinship-dialog__title span {
  color: var(--text-soft, #a89880);
  font-size: 12px;
  line-height: 1.55;
}

.kinship-dialog__close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  background: var(--color-neutral-2); border: 1px solid transparent;
  color: var(--color-neutral-6);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
}
.kinship-dialog__close:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  transform: rotate(4deg);
}

/* ── Body ── */
.kinship-dialog__body {
  display: flex;
  flex-direction: column;
  padding: 22px 24px 26px;
}

/* ── Selectors Row ── */
.kinship-selectors {
  order: 1;
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-neutral-2) 62%, transparent);
}

.kinship-selector {
  flex: 1; position: relative;
}

.kinship-selector__label {
  display: block;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-neutral-7);
  margin-bottom: 8px;
}

/* ── Search Input ── */
.kinship-selector__search {
  position: relative; display: flex; align-items: center;
}

.kinship-selector__search-icon {
  position: absolute; left: 12px;
  width: 15px; height: 15px;
  color: var(--text-soft, #a89880);
  pointer-events: none; z-index: 1;
}

.kinship-selector__input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1.5px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  font-size: 14px; font-family: inherit;
  background: var(--bg-paper, rgba(255, 255, 252, 0.94));
  color: var(--text-main, #3a3229);
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.kinship-selector__input:focus {
  border-color: var(--accent-amber, rgba(145, 99, 49, 0.4));
  box-shadow: 0 0 0 3px var(--line-soft, rgba(130, 99, 68, 0.1));
}

/* ── Selected Person Card ── */
.kinship-selected-person {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  background: var(--bg-paper, white);
  cursor: pointer;
  transition: border-color 150ms;
}
.kinship-selected-person:hover { border-color: var(--accent-amber, rgba(169, 110, 53, 0.3)); }

.kinship-selected-person__avatar {
  width: 40px; height: 40px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 500; flex-shrink: 0;
}

.kinship-selected-person__info {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.kinship-selected-person__name {
  font-size: 15px; font-weight: 500;
  color: var(--text-main, #3a3229);
  font-family: var(--font-serif);
}
.kinship-selected-person__meta {
  font-size: 12px; color: var(--text-soft, #a89880);
}

/* ── Avatar Colors ── */
.avatar--male { background: var(--color-male-muted); color: var(--color-male); }
.avatar--female { background: var(--color-female-muted); color: var(--color-female); }

/* ── Dropdown ── */
.kinship-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-panel-strong, #fffdf9);
  border: 1px solid var(--line-soft, rgba(124, 98, 69, 0.14));
  border-radius: 12px;
  max-height: 260px; overflow-y: auto;
  z-index: 10;
  box-shadow: 0 12px 28px rgba(82, 57, 28, 0.1);
}

.kinship-dropdown__item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 14px;
  text-align: left; background: none; border: none;
  font-size: 14px; font-family: inherit;
  cursor: pointer; color: var(--text-main);
  transition: background 120ms ease;
}
.kinship-dropdown__item:hover { background: rgba(169, 110, 53, 0.06); }
.kinship-dropdown__item:first-child { border-radius: 12px 12px 0 0; }
.kinship-dropdown__item:last-child { border-radius: 0 0 12px 12px; }

.kinship-dropdown__avatar {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 500; flex-shrink: 0;
}

.kinship-dropdown__info { display: flex; flex-direction: column; gap: 1px; }
.kinship-dropdown__name { color: var(--text-main); font-weight: 500; }
.kinship-dropdown__meta { font-size: 11px; color: var(--text-soft); }

.kinship-dropdown__empty {
  padding: 14px; text-align: center;
  color: var(--text-soft); font-size: 13px;
}

/* ── Swap Button ── */
.kinship-swap {
  flex-shrink: 0; margin-top: 19px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  border: 1.5px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  background: var(--bg-paper, white);
  cursor: pointer;
  color: var(--text-soft, #a89880);
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.kinship-swap:hover {
  border-color: var(--accent-amber, rgba(145, 99, 49, 0.35));
  color: var(--accent-amber, #916331);
  transform: scale(1.06);
}

/* ── Path Section ── */
.kinship-path-section {
  order: 3;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-card-stroke);
}

.kinship-path-section__label {
  font-size: 11px; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft, #a89880);
  margin-bottom: 12px;
}

.kinship-path-chain {
  display: flex; align-items: center; justify-content: center;
  gap: 0; padding: 16px 12px;
  background: color-mix(in srgb, var(--color-neutral-2) 58%, transparent);
  border-radius: 14px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.12));
  overflow-x: auto;
}

.kinship-path-node {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; flex-shrink: 0; position: relative;
}

.kinship-path-node__avatar {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 500;
}

.kinship-path-node__name {
  font-size: 11px; font-weight: 500; color: var(--text-sub, #6b5e4e);
  max-width: 64px; text-align: center; line-height: 1.3;
}

.kinship-path-node__tag {
  position: absolute; top: -6px;
  font-size: 9px; font-weight: 500; letter-spacing: 0.05em;
  padding: 1px 6px; border-radius: 8px;
  white-space: nowrap;
}
.kinship-path-node__tag--a { background: var(--color-male-muted); color: var(--color-male); right: 50%; transform: translateX(50%); }
.kinship-path-node__tag--b { background: var(--color-female-muted); color: var(--color-female); right: 50%; transform: translateX(50%); }
.kinship-path-node__tag--ancestor { background: var(--color-warning-muted); color: var(--color-warning); }

.kinship-path-node--endpoint .kinship-path-node__avatar {
  box-shadow: 0 0 0 2.5px var(--accent-amber, #916331), 0 2px 8px rgba(180, 130, 60, 0.25);
}
.kinship-path-node--endpoint .kinship-path-node__name {
  color: var(--accent-amber, #916331); font-weight: 500;
}
.kinship-path-node--ancestor .kinship-path-node__avatar {
  box-shadow: 0 0 0 2.5px rgba(180, 130, 60, 0.5);
}

.kinship-path-node--spouse .kinship-path-node__avatar {
  box-shadow: 0 0 0 2.5px rgba(196, 122, 90, 0.5);
  border: 2px dashed rgba(196, 122, 90, 0.4);
}

.kinship-path-edge {
  flex-shrink: 0; padding: 0 4px;
  color: var(--text-soft, #c4b8a6);
}

.kinship-path-desc {
  margin-top: 12px;
  font-size: 13px; color: var(--text-sub, #6b5e4e);
  text-align: center; line-height: 1.7;
}

/* ── Result ── */
.kinship-result {
  order: 2;
  margin-top: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-accent) 11%, transparent), transparent 68%),
    var(--color-panel-bg);
}

.kinship-result__who {
  font-size: 15px; color: var(--text-sub, #6b5e4e);
  margin-bottom: 16px; display: flex;
  align-items: center; justify-content: center;
  gap: 6px; flex-wrap: wrap;
}

.kinship-result__who-a,
.kinship-result__who-b {
  font-family: var(--font-serif);
  font-weight: 500; font-size: 17px;
  color: var(--text-main, #3a3229);
}

.kinship-result__who-label {
  color: var(--text-soft, #a89880);
}

.kinship-result__term {
  font-family: var(--font-serif);
  font-size: 48px; font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.08em; line-height: 1.1;
}

.kinship-result__desc {
  margin-top: 8px;
  font-size: 14px; color: var(--text-soft, #a89880);
}

.kinship-result__chips {
  display: flex; gap: 8px; justify-content: center;
  margin-top: 20px; flex-wrap: wrap;
}

.kinship-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 500;
  background: rgba(124, 98, 69, 0.06);
  color: var(--text-sub, #6b5e4e);
}

.chip--inlaw {
  background: rgba(196, 122, 90, 0.1);
  color: #a8624a;
}

/* ── Detail Toggle ── */
.kinship-detail-toggle {
  margin-top: 24px; text-align: left;
  border-top: 1px solid var(--line-soft, rgba(124, 98, 69, 0.1));
  padding-top: 14px;
}
.kinship-detail-toggle summary {
  font-size: 12px; font-weight: 500; color: var(--text-soft);
  cursor: pointer; user-select: none;
  display: inline-block;
}
.kinship-detail-toggle summary:hover { color: var(--text-sub); }
.kinship-detail-text {
  margin-top: 10px; font-size: 13px; color: var(--text-sub);
  line-height: 1.8; padding: 10px 14px;
  background: rgba(124, 98, 69, 0.03);
  border-radius: 10px;
}

/* ── Empty State ── */
.kinship-empty {
  order: 2;
  text-align: center; padding: 34px 0 12px;
}
.kinship-empty__icon { margin-bottom: 14px; }
.kinship-empty p {
  font-size: 14px; color: var(--text-soft, #a89880);
  margin: 0;
}

.kinship-dialog button:focus-visible,
.kinship-selector__input:focus-visible {
  outline: 3px solid var(--color-accent-muted);
  outline-offset: 2px;
}

/* ── Transition ── */
.kinship-fade-enter-active { transition: opacity 0.25s ease; }
.kinship-fade-leave-active { transition: opacity 0.2s ease; }
.kinship-fade-enter-from,
.kinship-fade-leave-to { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 600px) {
  .kinship-overlay { padding: 12px; }
  .kinship-dialog { max-height: calc(100dvh - 24px); }
  .kinship-dialog__header { padding: 18px 18px 14px; }
  .kinship-dialog__body { padding: 16px 18px 20px; }
  .kinship-selectors { flex-direction: column; }
  .kinship-swap { transform: rotate(90deg); margin-top: 8px; align-self: center; }
  .kinship-swap:hover { transform: rotate(90deg) scale(1.06); }
  .kinship-result__term { font-size: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .kinship-fade-enter-active,
  .kinship-fade-leave-active,
  .kinship-fade-enter-active .kinship-dialog,
  .kinship-fade-leave-active .kinship-dialog {
    transition: none;
  }
}
</style>


