<script setup lang="ts">
import type { FamilyBranchMode, Gender, Person } from '../types/family'
import { uploadPhoto, getPhotoUrl } from '../api/photo'

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

type EditablePersonField = 'name' | 'birth' | 'death' | 'age' | 'titleName' | 'clan' | 'note' | 'avatarUrl'

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
  branchMode: FamilyBranchMode | ''
  parentActionLabel: string
  branchActionLabel: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select-person', personId: string): void
  (event: 'add-spouse'): void
  (event: 'add-child', gender: Gender): void
  (event: 'add-parents'): void
  (event: 'remove-spouse'): void
  (event: 'remove-parents'): void
  (event: 'focus-branch'): void
  (event: 'update-branch-mode', branchMode: FamilyBranchMode): void
  (event: 'swap-partners'): void
  (event: 'move-child', payload: { childId: string; direction: -1 | 1 }): void
  (event: 'update-person-field', payload: { field: EditablePersonField; value: string }): void
  (event: 'update-person-gender', gender: Gender): void
  (event: 'apply-note-suggestion', value: string): void
  (event: 'delete-person'): void
  (event: 'view-detail'): void
}>()

function updatePersonField(field: EditablePersonField, event: Event) {
  emit('update-person-field', { field, value: (event.target as HTMLInputElement).value })
}

function updatePersonGender(event: Event) {
  emit('update-person-gender', (event.target as HTMLSelectElement).value as Gender)
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  if (!props.publicationId) {
    alert('请先保存族谱到服务器后再上传照片')
    return
  }

  const file = input.files[0]
  try {
    const photoId = await uploadPhoto(props.person.id, props.publicationId, file)
    emit('update-person-field', { field: 'avatarUrl', value: getPhotoUrl(photoId) })
  } catch (error) {
    console.error('上传出错', error)
    alert('上传出错，请检查后端服务是否启动')
  }
}
</script>

<template>
  <Transition name="editor-sheet">
    <div v-if="open" class="editor-overlay">
      <button class="editor-overlay__scrim" type="button" aria-label="关闭人物编辑" @click="$emit('close')" />

      <aside class="editor-sheet-panel">
        <div class="editor-sheet-panel__header">
          <div>
            <p class="editor-sheet-panel__eyebrow">Person Editor</p>
            <h3>{{ person.name }}</h3>
          </div>
          <button class="editor-sheet-panel__close" type="button" @click="$emit('close')">关闭</button>
        </div>

        <div class="editor-focus">
          <div class="editor-focus__title" style="display: flex; align-items: center; gap: 16px;">
            <div class="avatar-upload" style="position: relative; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; background: rgba(169, 110, 53, 0.05); border: 1px solid var(--border-color); flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <img v-if="person.avatarUrl" :src="person.avatarUrl" style="width: 100%; height: 100%; object-fit: contain;" />
              <div v-else style="font-size: 28px; opacity: 0.5;">👤</div>
              <input type="file" accept="image/*" @change="uploadAvatar" style="position: absolute; inset: 0; opacity: 0; cursor: pointer;" title="上传照片" />
            </div>
            <div style="flex: 1;">
              <p>当前人物</p>
              <h3>{{ person.name }}</h3>
            </div>
            <span>{{ [person.titleName, person.clan, person.note || lineageSuggestion].filter(Boolean).join(' · ') || '待补注记' }}</span>
          </div>
          <p class="editor-focus__hint">{{ suggestion }}</p>

          <div class="editor-focus__grid">
            <div v-for="item in details" :key="item.label" class="editor-mini-card">
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
            <span class="relationship-panel__badge">{{ children.length }} 位子女</span>
          </div>

          <div class="relationship-grid">
            <article class="relationship-card">
              <span>配偶</span>
              <strong>{{ spouse?.name || '未建立配偶关系' }}</strong>
            </article>
            <article class="relationship-card">
              <span>父母</span>
              <strong>{{ parents.length ? parents.map((item) => item.name).join(' · ') : '未建立父母关系' }}</strong>
            </article>
            <article class="relationship-card relationship-card--wide">
              <span>子女</span>
              <strong>{{ children.length ? children.map((item) => item.name).join(' · ') : '暂无子女' }}</strong>
            </article>
          </div>

          <div class="relationship-section">
            <div class="relationship-section__header">
              <strong>配偶关系</strong>
              <span>建立或调整夫妻位置</span>
            </div>
            <div class="relationship-actions">
              <button class="relation-btn" type="button" :disabled="!canAddSpouse" @click="$emit('add-spouse')">新增配偶</button>
              <button class="relation-btn" type="button" :disabled="!canSwapAdults" @click="$emit('swap-partners')">切换夫妻位置</button>
              <button class="relation-btn relation-btn--danger relationship-actions__wide" type="button" :disabled="!spouse" @click="$emit('remove-spouse')">
                解除配偶关系
              </button>
            </div>
          </div>

          <div class="relationship-section">
            <div class="relationship-section__header">
              <strong>父母关系</strong>
              <span>补齐上代信息或解除引用</span>
            </div>
            <div class="relationship-actions">
              <button class="relation-btn" type="button" :disabled="hasCompleteParents" @click="$emit('add-parents')">
                {{ parentActionLabel }}
              </button>
              <button class="relation-btn relation-btn--danger" type="button" :disabled="!parents.length" @click="$emit('remove-parents')">
                解除父母关系
              </button>
            </div>
          </div>

          <div class="relationship-section">
            <div class="relationship-section__header">
              <strong>子女关系</strong>
              <span>按性别新增，并可调整排序</span>
            </div>
            <div class="relationship-actions">
              <button class="relation-btn" type="button" @click="$emit('add-child', 'male')">新增儿子</button>
              <button class="relation-btn" type="button" @click="$emit('add-child', 'female')">新增女儿</button>
            </div>
          </div>

          <div class="relationship-section relationship-section--branch">
            <div class="relationship-section__header">
              <strong>谱系查看</strong>
              <span>切换到当前人物所在宗支</span>
            </div>
            <div class="branch-actions">
              <button class="relation-btn relation-btn--accent" type="button" :disabled="isSelectedBranchFocused" @click="$emit('focus-branch')">
                {{ branchActionLabel }}
              </button>
            </div>
          </div>

          <div v-if="canSetBranchMode" class="relationship-section relationship-section--branch">
            <div class="relationship-section__header">
              <strong>婚配归属</strong>
              <span>女性成家后可区分外嫁或招婿</span>
            </div>
            <div class="relationship-actions">
              <button
                class="relation-btn"
                :class="{ 'relation-btn--accent': branchMode === 'married-out' }"
                type="button"
                @click="$emit('update-branch-mode', 'married-out')"
              >
                外嫁
              </button>
              <button
                class="relation-btn"
                :class="{ 'relation-btn--accent': branchMode === 'uxorilocal' }"
                type="button"
                @click="$emit('update-branch-mode', 'uxorilocal')"
              >
                招婿
              </button>
            </div>
          </div>

          <div v-if="childItems.length" class="child-order-panel">
            <div class="child-order-panel__header">
              <span>子女顺序</span>
              <strong>左右顺序会影响画布排布</strong>
            </div>

            <div class="child-order-list">
              <article v-for="child in childItems" :key="child.person.id" class="child-order-item">
                <button class="child-order-item__main" type="button" @click="$emit('select-person', child.person.id)">
                  <strong>{{ child.index + 1 }}. {{ child.person.name }}</strong>
                  <span>{{ child.person.titleName || child.person.note || '子女' }}</span>
                </button>
                <div class="child-order-item__actions">
                  <button class="relation-icon-btn" type="button" :disabled="child.isFirst" @click="$emit('move-child', { childId: child.person.id, direction: -1 })">
                    ←
                  </button>
                  <button class="relation-icon-btn" type="button" :disabled="child.isLast" @click="$emit('move-child', { childId: child.person.id, direction: 1 })">
                    →
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <div class="editor-form">
          <label class="field">
            <span>性别</span>
            <select :value="person.gender" @change="updatePersonGender">
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="unknown">未定</option>
            </select>
          </label>

          <label class="field">
            <span>姓名</span>
            <input :value="person.name" type="text" @input="updatePersonField('name', $event)" />
          </label>

          <label class="field">
            <span>出生</span>
            <input :value="person.birth" type="text" placeholder="如：1978年十月初八" @input="updatePersonField('birth', $event)" />
          </label>

          <label class="field">
            <span>称号</span>
            <input :value="person.titleName" type="text" placeholder="如：唐太宗 / 宣统帝 / 皇太子" @input="updatePersonField('titleName', $event)" />
          </label>

          <label class="field">
            <span>宗族</span>
            <input :value="person.clan" type="text" placeholder="如：陇西李氏 / 爱新觉罗氏" @input="updatePersonField('clan', $event)" />
          </label>

          <label class="field">
            <span>卒年</span>
            <input :value="person.death" type="text" placeholder="如：2022年五月" @input="updatePersonField('death', $event)" />
          </label>

          <label class="field">
            <span>年龄</span>
            <input :value="person.age" type="text" placeholder="支持直接填写 71岁" @input="updatePersonField('age', $event)" />
          </label>

          <label class="field">
            <span>注记</span>
            <input :value="person.note" type="text" placeholder="如：长房 / 次子 / 配偶" @input="updatePersonField('note', $event)" />
          </label>

          <div v-if="lineageSuggestion" class="lineage-suggestion">
            <span>系统推算：{{ lineageSuggestion }}</span>
            <button
              v-if="person.note !== lineageSuggestion"
              type="button"
              @click="$emit('apply-note-suggestion', lineageSuggestion)"
            >
              填入注记
            </button>
          </div>
        </div>

        <section class="detail-link-zone">
          <button class="relation-btn relation-btn--secondary" type="button" @click="$emit('view-detail')">
            查看详情页
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </section>

        <section class="danger-zone">
          <div>
            <p>危险操作</p>
            <span>删除会同步清理此人物在配偶、父母、子女关系中的引用。</span>
          </div>
          <button class="relation-btn relation-btn--danger" type="button" @click="$emit('delete-person')">删除人物</button>
        </section>
      </aside>
    </div>
  </Transition>
</template>
