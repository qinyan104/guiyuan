<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePublicationState } from '../composables/usePublicationState'
import { useUiStore, THEME_PRESETS } from '../stores/ui'

const router = useRouter()

let uiStore: any = null
try {
  uiStore = useUiStore()
} catch {
  uiStore = { theme: 'slate', setTheme: () => {} }
}

let pubState: any = null
try {
  pubState = (usePublicationState as any)()
} catch {
  pubState = { publications: ref([]) }
}

const isOpen = ref(false)
const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  category: 'action' | 'publication' | 'theme' | 'tool'
  icon: string
  action: () => void
}

const staticCommands = computed<CommandItem[]>(() => [
  {
    id: 'cmd-new-pub',
    title: '新建宗谱存档',
    subtitle: '开宗立派，创建全新的家族基因档案库',
    category: 'action',
    icon: 'plus-square',
    action: () => {
      router.push('/dashboard/publications')
      isOpen.value = false
    },
  },
  {
    id: 'cmd-book-editor',
    title: '古籍活字排版编辑器',
    subtitle: '进入传统排版制作竖排线装书卷 PDF',
    category: 'tool',
    icon: 'book-open',
    action: () => {
      const pubId = router.currentRoute.value.params.id || router.currentRoute.value.params.publicationId || '1'
      router.push(`/book-editor/publication/${pubId}`)
      isOpen.value = false
    },
  },
  {
    id: 'cmd-settings',
    title: '系统与账号设置',
    subtitle: '调整系统偏好、修改密码与权限',
    category: 'action',
    icon: 'settings',
    action: () => {
      router.push('/dashboard/settings')
      isOpen.value = false
    },
  },
  ...(THEME_PRESETS.map(({ id: themeId, name }) => ({
    id: `theme-${themeId}`,
    title: `切换为：${name}`,
    subtitle: uiStore?.currentTheme === themeId ? '当前正在使用' : '切换界面配色',
    category: 'theme' as const,
    icon: 'palette',
    action: () => {
      uiStore?.setTheme?.(themeId)
      isOpen.value = false
    },
  }))),
])

const publicationCommands = computed<CommandItem[]>(() => {
  const list = pubState?.publications?.value
  if (!Array.isArray(list)) return []
  return list.map((pub: any) => ({
    id: `pub-${pub.id}`,
    title: pub.title || '未命名宗谱',
    subtitle: [pub.subtitle, pub.info?.hallName, pub.info?.ancestralOrigin].filter(Boolean).join(' · ') || '宗谱归档',
    category: 'publication',
    icon: 'file-text',
    action: () => {
      router.push(`/workbench?publicationId=${pub.id}`)
      isOpen.value = false
    },
  }))
})

const allCommands = computed<CommandItem[]>(() => [
  ...staticCommands.value,
  ...publicationCommands.value,
])

const filteredCommands = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return allCommands.value
  return allCommands.value.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query))
  )
})

watch(filteredCommands, () => {
  selectedIndex.value = 0
})

function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      searchQuery.value = ''
      nextTick(() => inputRef.value?.focus())
    }
  } else if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  } else if (isOpen.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredCommands.value.length > 0) {
        selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filteredCommands.value.length > 0) {
        selectedIndex.value =
          (selectedIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filteredCommands.value[selectedIndex.value]
      if (target) {
        target.action()
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <transition name="sheet-slide">
      <div
        v-if="isOpen"
        class="command-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="全局指令面板"
        @click.self="isOpen = false"
      >
        <div class="command-palette-card">
          <!-- Search Header -->
          <div class="command-search-header">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              ref="inputRef"
              v-model="searchQuery"
              type="text"
              class="command-input"
              placeholder="输入指令、搜索宗谱、切换主题..."
            />
            <span class="esc-badge" @click="isOpen = false">ESC</span>
          </div>

          <!-- Results List -->
          <div class="command-results-list">
            <div
              v-if="filteredCommands.length === 0"
              class="command-empty"
            >
              未找到与「{{ searchQuery }}」匹配的指令或宗谱
            </div>

            <div
              v-for="(item, index) in filteredCommands"
              :key="item.id"
              class="command-item"
              :class="{ selected: index === selectedIndex }"
              @mouseenter="selectedIndex = index"
              @click="item.action()"
            >
              <div class="item-icon">
                <svg v-if="item.category === 'action'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <svg v-else-if="item.category === 'publication'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <svg v-else-if="item.category === 'theme'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12.5" cy="8.5" r="1.5"/><circle cx="8.5" cy="12.5" r="1.5"/><circle cx="15.5" cy="12.5" r="1.5"/><circle cx="12.5" cy="16.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>

              <div class="item-text">
                <div class="item-title">{{ item.title }}</div>
                <div v-if="item.subtitle" class="item-subtitle">{{ item.subtitle }}</div>
              </div>

              <div class="item-enter-hint" v-if="index === selectedIndex">
                <span>跳转</span> ↵
              </div>
            </div>
          </div>

          <!-- Command Footer Cues -->
          <div class="command-footer">
            <span class="key-hint"><b>↑ ↓</b> 遍历选项</span>
            <span class="key-hint"><b>↵ Enter</b> 确认跳转</span>
            <span class="key-hint"><b>Ctrl + K</b> 随时呼出/隐藏</span>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.command-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay, rgba(15, 23, 42, 0.4));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 9999;
  padding-top: 12vh;
}

.command-palette-card {
  width: 100%;
  max-width: 620px;
  background: var(--color-panel-bg, #ffffff);
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.1));
  border-radius: var(--radius-2xl, 20px);
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.22), var(--shadow-whisper);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.97) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.command-search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08));
}

.search-icon {
  color: var(--color-neutral-6);
  flex-shrink: 0;
}

.command-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  color: var(--color-neutral-10);
  outline: none;
}

.command-input::placeholder {
  color: var(--color-neutral-5);
}

.esc-badge {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
  border: 1px solid var(--color-card-stroke);
  cursor: pointer;
}

.command-results-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 8px;
}

.command-empty {
  padding: 32px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--color-neutral-6);
}

.command-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: var(--radius-lg, 12px);
  cursor: pointer;
  transition: all 120ms ease;
}

.command-item.selected {
  background: var(--color-accent-muted, rgba(37, 99, 235, 0.08));
  color: var(--color-accent);
}

.item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.command-item.selected .item-icon {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #ffffff);
}

.item-text {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-10);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-subtitle {
  font-size: 12px;
  color: var(--color-neutral-6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-enter-hint {
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.command-footer {
  padding: 10px 20px;
  border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08));
  background: var(--color-neutral-1, rgba(0, 0, 0, 0.02));
  display: flex;
  align-items: center;
  gap: 16px;
}

.key-hint {
  font-size: 11px;
  color: var(--color-neutral-6);
}

.key-hint b {
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  background: var(--color-neutral-3);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--color-neutral-8);
}
</style>
