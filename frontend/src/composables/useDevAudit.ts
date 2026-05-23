// ─── 开发期写操作审计 ───
// 仅在 dev 模式下激活。对关键 composable 的变更自动记录：
//   触发源 | 变更字段 | 旧值概要 | 新值概要 | 耗时
//
// 用法：
//   const audit = useDevAudit("usePublicationState")
//   audit.track("setViewerPersonId", { from: oldId, to: newId })

import { ref } from "vue"

const IS_DEV = import.meta.env.DEV

export interface AuditEntry {
  /** 审计目标名称（如 composable 名） */
  source: string
  /** 操作名称 */
  action: string
  /** 触发时间 ISO */
  timestamp: string
  /** 操作耗时 ms，-1 表示未计时 */
  durationMs: number
  /** 附加上下文 */
  detail?: Record<string, unknown>
}

/** 全局日志存储（仅在 dev 模式保留） */
const auditLog = ref<AuditEntry[]>([])

/** 保留最近 N 条，防止内存泄漏 */
const MAX_ENTRIES = 200

function prune(): void {
  if (auditLog.value.length > MAX_ENTRIES) {
    auditLog.value = auditLog.value.slice(-MAX_ENTRIES)
  }
}

export function useDevAudit(source: string) {
  if (!IS_DEV) {
    // 生产模式：所有方法都是 no-op
    return {
      track(_action: string, _detail?: Record<string, unknown>) {},
      trackTimed(_action: string, _detail?: Record<string, unknown>) {
        return { end: () => {} }
      },
      getLog: () => [] as AuditEntry[],
      clearLog: () => {},
    }
  }

  function track(action: string, detail?: Record<string, unknown>): void {
    const entry: AuditEntry = {
      source,
      action,
      timestamp: new Date().toISOString(),
      durationMs: -1,
      detail,
    }
    auditLog.value.push(entry)
    prune()

    // 控制台简洁输出
    const detailStr = detail
      ? " | " +
        Object.entries(detail)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(" ")
      : ""
    console.debug(
      `%c[audit]%c ${source}.${action}%c${detailStr}`,
      "color:#a96e35;font-weight:700",
      "color:#241a10;font-weight:600",
      "color:#6b5035",
    )
  }

  function trackTimed(action: string, detail?: Record<string, unknown>) {
    const t0 = performance.now()
    const startISO = new Date().toISOString()

    return {
      end: (endDetail?: Record<string, unknown>) => {
        const durationMs = Math.round(performance.now() - t0)
        const entry: AuditEntry = {
          source,
          action,
          timestamp: startISO,
          durationMs,
          detail: { ...detail, ...endDetail },
        }
        auditLog.value.push(entry)
        prune()

        const detailStr = entry.detail
          ? " | " +
            Object.entries(entry.detail)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(" ")
          : ""
        console.debug(
          `%c[audit]%c ${source}.${action} %c${durationMs}ms%c${detailStr}`,
          "color:#a96e35;font-weight:700",
          "color:#241a10;font-weight:600",
          "color:#8a6845",
          "color:#6b5035",
        )
      },
    }
  }

  function getLog(): AuditEntry[] {
    return auditLog.value
  }

  function clearLog(): void {
    auditLog.value = []
  }

  return { track, trackTimed, getLog, clearLog }
}

/** 获取全局审计日志（跨 composable 汇总） */
export function getGlobalAuditLog(): AuditEntry[] {
  return auditLog.value
}

/** 清空全局审计日志 */
export function clearGlobalAuditLog(): void {
  auditLog.value = []
}

/** 挂到 window 上方便控制台调试 */
if (IS_DEV) {
  ;(window as any).__auditLog = auditLog
}
