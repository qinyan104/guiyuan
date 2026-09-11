<script setup lang="ts">
defineProps<{ visible: boolean }>()
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="role-guidance">
      <div class="role-card role-editor">
        <div class="role-card-header">
          <span class="role-badge-dot editor"></span>
          <strong>编辑者</strong>
        </div>
        <p>可修改族谱内容，但不能删除所有者或执行高风险合并操作。</p>
      </div>
      <div class="role-card role-viewer">
        <div class="role-card-header">
          <span class="role-badge-dot viewer"></span>
          <strong>浏览者</strong>
        </div>
        <p>只能查看族谱，系统会自动对在世成员的生日、照片等敏感信息进行脱敏。</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; margin-bottom: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 200px; }
.role-guidance { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.role-card { padding: 10px 12px; background: var(--color-neutral-1); border: 1px solid var(--color-neutral-4); border-radius: 10px; font-size: 12px; color: var(--color-neutral-6); line-height: 1.5; }
.role-card p { margin: 4px 0 0; }
.role-card-header { display: flex; align-items: center; gap: 6px; color: var(--color-neutral-9); font-size: 13px; }
.role-badge-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.role-badge-dot.editor { background: var(--color-accent); }
.role-badge-dot.viewer { background: var(--color-success); }
@media (max-width: 560px) { .role-guidance { grid-template-columns: 1fr; } }
</style>
