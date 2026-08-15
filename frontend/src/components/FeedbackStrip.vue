<script setup lang="ts">
/**
 * FeedbackStrip — 统一反馈条组件
 *
 * 使用：
 *   <FeedbackStrip status-message="保存成功" @dismiss="clear" />
 *   <FeedbackStrip error-message="保存失败" @dismiss="clear" />
 *   <FeedbackStrip warning-message="部分数据未同步" @dismiss="clear" />
 *   <FeedbackStrip info-message="正在处理..." @dismiss="clear" />
 *
 * 样式由 interaction-baseline.css 提供：
 *   .feedback-strip          — 成功（默认）
 *   .feedback-strip--error   — 错误
 *   .feedback-strip--warning — 警告
 *   .feedback-strip--info    — 信息
 */
import { computed } from "vue"

const props = defineProps<{
  errorMessage?: string
  statusMessage?: string
  warningMessage?: string
  infoMessage?: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

type Variant = "success" | "error" | "warning" | "info"

const variant = computed<Variant | null>(() => {
  if (props.errorMessage) return "error"
  if (props.warningMessage) return "warning"
  if (props.infoMessage) return "info"
  if (props.statusMessage) return "success"
  return null
})

const message = computed(() =>
  props.errorMessage || props.warningMessage || props.infoMessage || props.statusMessage || "",
)

const labels: Record<Variant, string> = {
  success: "操作完成",
  error:   "需要处理",
  warning: "请注意",
  info:    "提示",
}

const variantLabel = computed(() => (variant.value ? labels[variant.value] : ""))

function dismiss() {
  emit("dismiss")
}
</script>

<template>
  <div
    v-if="message"
    class="feedback-strip"
    :class="{
      'feedback-strip--error': variant === 'error',
      'feedback-strip--warning': variant === 'warning',
      'feedback-strip--info': variant === 'info',
    }"
  >
    <strong>{{ variantLabel }}</strong>
    <span>{{ message }}</span>
    <button type="button" @click="dismiss">关闭</button>
  </div>
</template>

<style scoped>
/* ── Feedback Strip ── */
.feedback-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
  font-size: var(--text-copy-14);
  line-height: 1.4;
  background: var(--color-success-muted, rgba(61, 127, 94, 0.1));
  color: var(--color-success);
  border: 1px solid var(--color-success-muted);
  box-shadow: var(--shadow-whisper);
}

.feedback-strip strong {
  font-weight: 600;
  flex-shrink: 0;
}

.feedback-strip span {
  flex: 1;
}

.feedback-strip button {
  flex-shrink: 0;
  padding: 3px 10px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-2);
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}

.feedback-strip button:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.feedback-strip--error {
  background: var(--color-error-muted, rgba(181, 61, 88, 0.1));
  color: var(--color-error);
  border-color: var(--color-error-muted);
}

.feedback-strip--warning {
  background: var(--color-warning-muted, rgba(180, 138, 68, 0.1));
  color: var(--color-warning);
  border-color: var(--color-warning-muted);
}

.feedback-strip--info {
  background: var(--color-info-muted, rgba(46, 92, 138, 0.1));
  color: var(--color-info);
  border-color: var(--color-info-muted);
}
</style>
