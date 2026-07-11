<script setup lang="ts">
/**
 * PoeticHeader — 诗意排版头部
 *
 * 7 个 Admin/Dashboard 视图共享的头部组件。
 * 左侧：eyebrow 小标签 + title 大标题（可选 italic 后缀）
 * 右侧：#extra 插槽（引用、按钮等）
 *
 * 用法：
 *   <PoeticHeader eyebrow="族谱管理" title="族人账号" />
 *   <PoeticHeader :eyebrow="t.eyebrow" :title="t.title" :title-italic="t.italic">
 *     <template #extra><p class="quote">...</p></template>
 *   </PoeticHeader>
 */
defineProps<{
  eyebrow: string
  title: string
  titleItalic?: string
}>()
</script>

<template>
  <header class="poetic-header">
    <div class="poetic-header__main">
      <div class="poetic-eyebrow">{{ eyebrow }}</div>
      <h1 class="poetic-title">
        {{ title }}<span v-if="titleItalic" class="text-italic">{{ titleItalic }}</span>
      </h1>
    </div>
    <div v-if="$slots.extra" class="poetic-header__extra">
      <slot name="extra" />
    </div>
  </header>
</template>

<style scoped>
.poetic-header {
  position: relative;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0 0.8rem 1.8rem;
  border-bottom: 1px solid var(--line-soft, var(--color-card-stroke));
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 3rem;
}

.poetic-header__main {
  flex: 0 0 auto;
}

.poetic-header__extra {
  flex: 1;
  max-width: 500px;
  padding-left: 2rem;
  border-left: 1px solid var(--line-soft, var(--color-card-stroke));
  margin-bottom: 0.2rem;
}

/* 朱砂血脉线 */
.poetic-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6rem;
  bottom: 1rem;
  width: 3px;
  background: linear-gradient(to bottom, var(--color-accent-deep), var(--color-accent), transparent);
  border-radius: 99px;
  box-shadow: 0 0 12px rgba(196, 58, 49, 0.2);
}

.poetic-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.4em;
  color: var(--accent-amber, var(--color-warning));
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.7;
}

.poetic-title {
  font-size: 2.2rem;
  line-height: 1;
  font-family: var(--font-serif);
  color: var(--text-main, var(--color-neutral-9));
  margin: 0;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.text-italic {
  font-style: italic;
  font-weight: 300;
  color: var(--accent-amber, var(--color-warning));
  font-family: var(--font-serif);
  margin-left: 0.15em;
}

/* Extra 插槽内的引用样式 */
.poetic-header__extra :deep(.poetic-quote) {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--text-soft, var(--color-neutral-6));
  margin: 0;
  letter-spacing: 0.06em;
  font-family: var(--font-serif);
  font-style: italic;
  opacity: 0.8;
}
</style>
