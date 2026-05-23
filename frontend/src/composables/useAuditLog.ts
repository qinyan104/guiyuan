// ============================================================
// 写操作审计日志 — Write Operation Audit Logger
//
// 用法：
//   const audit = createAuditLogger("usePublicationState")
//   audit.log("replaceReactiveObject", { personCount: Object.keys(source.people).length })
//   await audit.logAsync("saveToServer", async () => { ... })
//
// 仅在 DEV 模式或 localStorage ENABLE_AUDIT=true 时输出。
// 默认静默，不影响生产构建（tree-shaken）。
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonPrimitive = string | number | boolean | null | undefined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

/** 一条审计日志 */
export interface AuditEntry {
  /** 日志时间 ISO 字符串 */
  timestamp: string
  /** 命名空间（通常是 composable / 模块名） */
  namespace: string
  /** 动作名 */
  action: string
  /** 可选负载摘要（应为可序列化的小对象） */
  payload?: JsonValue
  /** 执行耗时（毫秒），仅 logAsync 有值 */
  durationMs?: number
  /** 是否有错误 */
  error?: string
}

/** 日志接收器 — 默认使用 console，可替换 */
export type AuditSink = (entry: AuditEntry) => void

// ---- 环境判断 ----

function isAuditEnabled(): boolean {
  if (typeof window === "undefined") return false
  // 生产环境默认关闭
  if (!import.meta.env.DEV) {
    try {
      return localStorage.getItem("ENABLE_AUDIT") === "true"
    } catch {
      return false
    }
  }
  // DEV 下默认开启，可通过 DISABLE_AUDIT 关闭
  try {
    if (localStorage.getItem("DISABLE_AUDIT") === "true") return false
  } catch {
    // localStorage 不可用时降级
  }
  return true
}

// ---- 默认 sink ----

const defaultSink: AuditSink = (entry) => {
  const icon = entry.error ? "❌" : entry.durationMs != null ? "⏱" : "📝"
  const duration = entry.durationMs != null ? ` (${entry.durationMs}ms)` : ""
  const payload = entry.payload ? ` | ${JSON.stringify(entry.payload)}` : ""
  const error = entry.error ? ` | ⚠ ${entry.error}` : ""

  console.debug(
    `%c[audit]%c ${icon} ${entry.namespace}.${entry.action}${duration}${payload}${error}`,
    "color: #a96e35; font-weight: 700",
    "color: inherit",
  )
}

// ---- 工厂 ----

let _sink: AuditSink = defaultSink

/** 替换全局审计日志接收器 */
export function setAuditSink(sink: AuditSink): void {
  _sink = sink
}

/**
 * 创建带命名空间的审计日志器。
 * 生产环境下不输出（除非显式启用），对性能影响可忽略。
 */
export function createAuditLogger(namespace: string) {
  const enabled = isAuditEnabled()

  function emit(action: string, payload?: JsonValue, durationMs?: number, error?: string) {
    if (!enabled) return
    _sink({
      timestamp: new Date().toISOString(),
      namespace,
      action,
      payload,
      durationMs,
      error,
    })
  }

  return {
    /** 同步审计：记录操作及简要上下文 */
    log(action: string, payload?: JsonValue): void {
      emit(action, payload)
    },

    /** 异步审计：包装异步函数，记录耗时及异常 */
    async logAsync<T>(action: string, payload: JsonValue | undefined, fn: () => Promise<T>): Promise<T> {
      const start = performance.now()
      try {
        const result = await fn()
        emit(action, payload, Math.round(performance.now() - start))
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        emit(action, payload, Math.round(performance.now() - start), message)
        throw err
      }
    },

    /** 条件启用：运行时可切换 */
    get enabled() {
      return enabled
    },
  }
}

export type AuditLogger = ReturnType<typeof createAuditLogger>
