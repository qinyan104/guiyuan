<script setup lang="ts">
import { builtinSamples } from '../data/builtinDynastySamples'

type BuiltinSample = (typeof builtinSamples)[number]

defineProps<{
  samples: BuiltinSample[]
  expanded: boolean
  cloningSampleId: string | null
  title: string
}>()

defineEmits<{
  (event: 'update:expanded', value: boolean): void
  (event: 'preview', sampleId: string): void
  (event: 'clone', sample: BuiltinSample): void
}>()

function getSamplePersonCount(sample: BuiltinSample): number {
  return Object.keys(sample.publication?.people || {}).length
}
</script>

<template>
  <section class="gallery-section template-section">
    <div class="section-eyebrow-row">
      <div class="section-eyebrow">
        <span class="dot-ember"></span> {{ title }}
        <span class="section-badge">{{ samples.length }} 部范本</span>
      </div>
      <button class="toggle-expand-btn" @click="$emit('update:expanded', !expanded)">
        <span>{{ expanded ? '收起范本' : '展开范本' }}</span>
        <svg :class="{ rotated: !expanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
    </div>

    <div v-show="expanded" class="template-grid">
      <div
        v-for="sample in samples"
        :key="sample.id"
        class="panel-glass template-card"
        tabindex="0"
        role="article"
        :aria-label="'模板：' + sample.publication.title"
      >
        <div class="template-bg"></div>
        <div class="template-content">
          <div class="template-meta-row">
            <span class="template-group-badge">{{ sample.group }}</span>
            <span class="template-count-badge">{{ getSamplePersonCount(sample) }} 位宗亲</span>
          </div>
          <h3 class="template-title">{{ sample.publication.title }}</h3>
          <p class="template-subtitle">{{ sample.publication.subtitle }}</p>
        </div>

        <div class="template-card-footer">
          <button class="template-sub-btn preview-btn" title="浏览世系范本" @click.stop="$emit('preview', sample.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            预览世系
          </button>
          <button class="template-sub-btn clone-btn" :disabled="cloningSampleId === sample.id" @click.stop="$emit('clone', sample)">
            <svg v-if="cloningSampleId !== sample.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            <span>{{ cloningSampleId === sample.id ? '拓印中...' : '以此建谱' }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gallery-section { margin-bottom: 2.5rem; }
.section-eyebrow-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.section-eyebrow { display: flex; align-items: center; gap: 8px; font-size: var(--text-label-12, 12px); font-weight: 500; letter-spacing: 0.15em; color: var(--color-neutral-6); text-transform: uppercase; }
.section-badge { font-size: 11px; font-weight: normal; letter-spacing: normal; color: var(--color-neutral-6); background: var(--color-neutral-2, rgba(0, 0, 0, 0.04)); padding: 1px 8px; border-radius: 12px; border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06)); }
.toggle-expand-btn { display: flex; align-items: center; gap: 6px; font-size: var(--text-label-12, 12px); color: var(--color-neutral-6); background: transparent; border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08)); border-radius: var(--radius-md, 8px); padding: 4px 10px; cursor: pointer; transition: all var(--duration-fast) var(--ease-breath); }
.toggle-expand-btn:hover { background: var(--color-card-fill); color: var(--color-neutral-9); }
.toggle-expand-btn svg { transition: transform var(--duration-normal) var(--ease-breath); }
.toggle-expand-btn svg.rotated { transform: rotate(180deg); }
.dot-ember { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }
.panel-glass { border-radius: var(--radius-xl, 16px); overflow: hidden; position: relative; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; background: var(--color-card-fill); border: 1px solid var(--color-card-stroke); }
.panel-glass:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm, 0 4px 16px rgba(0,0,0,0.06)); }
.panel-glass:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; box-shadow: 0 0 0 4px var(--color-accent-muted); }
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.template-card { padding: 1.25rem 1.4rem; display: flex; flex-direction: column; min-height: 155px; justify-content: space-between; }
.template-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent); pointer-events: none; }
.template-content { position: relative; z-index: 1; }
.template-meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.template-group-badge { font-size: 11px; font-weight: 600; color: var(--color-accent); background: var(--color-accent-muted); padding: 1px 7px; border-radius: 4px; border: 1px solid var(--color-accent-muted); }
.template-count-badge { font-size: 11px; color: var(--color-neutral-6); background: var(--color-neutral-2, rgba(0, 0, 0, 0.04)); padding: 1px 6px; border-radius: 4px; }
.template-title { font-family: var(--font-serif); font-size: 1.2rem; margin: 0 0 0.25rem; color: var(--color-neutral-10); font-weight: 500; }
.template-subtitle { font-size: 0.8rem; color: var(--color-neutral-6); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.template-card-footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06)); }
.template-sub-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 500; padding: 4px 10px; border-radius: var(--radius-sm, 6px); border: 1px solid var(--color-card-stroke); background: var(--color-card-fill); color: var(--color-neutral-7); cursor: pointer; transition: all var(--duration-fast) var(--ease-breath); }
.template-sub-btn:hover { background: var(--color-neutral-3); color: var(--color-neutral-9); }
.template-sub-btn.clone-btn { background: var(--color-accent); color: var(--color-text-on-accent, #fff); border-color: var(--color-accent); }
.template-sub-btn.clone-btn:hover { opacity: 0.92; }
</style>
