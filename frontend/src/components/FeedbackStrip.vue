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
