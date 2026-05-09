<script setup lang="ts">
import { ref, onMounted } from 'vue'

const visible = ref(false)
const currentStep = ref(0)

const ONBOARDING_KEY = 'genealogy_onboarding_done'

const steps = [
  {
    icon: 'create',
    title: '创建或导入族谱',
    desc: '点击"创建第一个族谱"开始全新的族谱编撰，或导入已有的族谱数据。您也可以浏览王朝示例模板快速上手。',
    action: '创建族谱',
    routeName: 'publications' as const,
  },
  {
    icon: 'people',
    title: '在画布中添加人物',
    desc: '进入族谱后，在工坊中使用画布工具添加人物节点。填写姓名、生卒年份等基本信息，建立人物关系。',
    action: '前往画布',
    routeName: 'workbench' as const,
  },
  {
    icon: 'detail',
    title: '完善人物详情',
    desc: '点击画布中的人物节点，进入纪传体个人志页面，可添加传文、照片、家训等丰富内容。',
    action: '完成',
    routeName: null,
  },
]

function getIcon(type: string) {
  if (type === 'create') return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  if (type === 'people') return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
}

onMounted(() => {
  let shown = false
  try { shown = !!localStorage.getItem(ONBOARDING_KEY) } catch {}
  if (!shown) visible.value = true
})

function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prev() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function goTo(_routeName: string | null) {
  dismiss()
}

function dismiss() {
  visible.value = false
  try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
}

defineExpose({ show: () => { visible.value = true; currentStep.value = 0 } })
</script>

<template>
  <Teleport to="body">
    <transition name="guide-fade">
      <div v-if="visible" class="onboarding-overlay" @click.self="dismiss">
        <div class="onboarding-panel">
          <!-- Step indicators -->
          <div class="step-dots">
            <span v-for="(_, i) in steps" :key="i" class="dot" :class="{ active: i === currentStep }"></span>
          </div>

          <!-- Step content -->
          <div class="step-content" v-for="(step, i) in steps" :key="i" v-show="i === currentStep">
            <div class="step-icon" v-html="getIcon(step.icon)"></div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-desc">{{ step.desc }}</p>
          </div>

          <!-- Actions -->
          <div class="guide-actions">
            <button v-if="currentStep > 0" class="guide-btn ghost" @click="prev">上一步</button>
            <div class="guide-spacer"></div>
            <button class="guide-btn ghost" @click="dismiss">跳过</button>
            <button v-if="currentStep < steps.length - 1" class="guide-btn primary" @click="next">下一步</button>
            <button v-else class="guide-btn primary" @click="dismiss">开始使用</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.onboarding-panel {
  width: 440px;
  max-width: 90vw;
  background: var(--bg-panel, #fff);
  border-radius: 28px;
  padding: 40px;
  box-shadow: 0 48px 80px rgba(0, 0, 0, 0.2);
  position: relative;
}
.step-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--glass-border-shadow);
  transition: all 0.3s ease;
}
.dot.active {
  background: var(--accent-amber);
  width: 24px;
  border-radius: 4px;
}
.step-content {
  text-align: center;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.step-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-ink), var(--accent-amber));
  border-radius: 16px;
  color: #fff;
  margin-bottom: 20px;
}
.step-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 12px;
}
.step-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  line-height: 1.7;
  margin: 0;
  max-width: 340px;
}
.guide-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
}
.guide-spacer { flex: 1; }
.guide-btn {
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.guide-btn.primary {
  background: var(--text-main);
  color: var(--bg-panel);
}
.guide-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.guide-btn.ghost {
  background: transparent;
  color: var(--text-soft);
}
.guide-btn.ghost:hover {
  background: rgba(0,0,0,0.04);
  color: var(--text-main);
}
.guide-fade-enter-active,
.guide-fade-leave-active {
  transition: opacity 0.3s ease;
}
.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
}
</style>
