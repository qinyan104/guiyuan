// ============================================================
// 业务错误分类器 — Business Error Classifier
// 统一映射 HTTP 状态码 / ApiResponse.code → 错误类别 → 用户提示
// ============================================================

/** 标准化的错误类别 */
export type ErrorCategory =
  | "auth"       // 401 — 登录过期 / token 无效
  | "permission" // 403 — 无权限
  | "not-found"  // 404 — 资源不存在
  | "conflict"   // 409 — 数据冲突 / 并发冲突
  | "validation" // 400 / 422 — 输入校验失败
  | "network"    // 无响应 / 超时 / CORS
  | "server"     // 5xx — 服务器内部错误
  | "unknown"

/** 结构化错误信息 */
export interface ClassifiedError {
  category: ErrorCategory
  /** 对用户友好的中文提示 */
  userMessage: string
  /** 是否建议自动重试 */
  retryable: boolean
  /** 原始 HTTP 状态码 */
  httpStatus: number | undefined
  /** 后端 ApiResponse.code */
  apiCode: number | undefined
  /** 后端返回的原始 message */
  serverMessage: string | undefined
}

// ---- 状态码 → 类别映射 ----
const STATUS_CATEGORY_MAP: Record<number, ErrorCategory> = {
  400: "validation",
  401: "auth",
  403: "permission",
  404: "not-found",
  409: "conflict",
  422: "validation",
  429: "server",
  500: "server",
  502: "server",
  503: "server",
  504: "server",
}

// ---- 类别 → 默认用户提示 ----
const CATEGORY_MESSAGES: Record<ErrorCategory, string> = {
  auth:       "登录已过期，请重新登录",
  permission: "没有权限执行此操作",
  "not-found": "请求的资源不存在",
  conflict:   "数据已被他人修改，请刷新后重试",
  validation: "输入数据不符合要求，请检查后重试",
  network:    "网络连接异常，请检查网络后重试",
  server:     "服务器繁忙，请稍后重试",
  unknown:    "操作失败，请稍后重试",
}

// ---- 类别 → 是否可重试 ----
const CATEGORY_RETRYABLE: Record<ErrorCategory, boolean> = {
  auth:       false,  // 需要重新登录
  permission: false,  // 权限不足，重试无意义
  "not-found": false,
  conflict:   true,   // 刷新后可重试
  validation: false,  // 输入问题，需修正
  network:    true,   // 网络恢复后可重试
  server:     true,   // 服务器恢复后可重试
  unknown:    true,
}

// ---- Axios 错误类型守卫 ----
interface AxiosLikeError {
  response?: { status?: number; data?: { message?: string; code?: number } }
  config?: { url?: string; method?: string }
  code?: string  // "ERR_NETWORK" / "ECONNABORTED" 等
  message?: string
}

function isAxiosLike(error: unknown): error is AxiosLikeError {
  return typeof error === "object" && error !== null && "response" in (error as Record<string, unknown>)
}

// ============================================================
// 公用 API
// ============================================================

/** 从任意错误对象中提取结构化分类 */
export function classifyError(error: unknown): ClassifiedError {
  // 1. 非 Axios 错误（可能是手动 throw new Error）
  if (!isAxiosLike(error)) {
    const msg = error instanceof Error ? error.message : String(error ?? "")
    // 检查是否为 ApiResponse.code !== 200 抛出的错误
    return {
      category: "unknown",
      userMessage: msg || CATEGORY_MESSAGES.unknown,
      retryable: CATEGORY_RETRYABLE.unknown,
      httpStatus: undefined,
      apiCode: undefined,
      serverMessage: msg || undefined,
    }
  }

  const httpStatus = error.response?.status
  const apiCode = error.response?.data?.code
  const serverMessage = error.response?.data?.message

  // 2. 网络层错误（无 response）
  if (!httpStatus) {
    const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout")
    return {
      category: "network",
      userMessage: isTimeout ? "请求超时，请检查网络后重试" : CATEGORY_MESSAGES.network,
      retryable: true,
      httpStatus: undefined,
      apiCode: undefined,
      serverMessage: error.message,
    }
  }

  // 3. 按 HTTP 状态码分类
  const category = STATUS_CATEGORY_MAP[httpStatus] ?? "unknown"

  // 4. 特殊处理：409 在 publications 路径上 = 出版物冲突
  const url = error.config?.url ?? ""
  const isPublicationConflict =
    category === "conflict" && url.includes("/publications/")

  // 5. 组装用户消息：优先用后端 message，其次用类别默认
  const userMessage =
    (isPublicationConflict && serverMessage)
      ? serverMessage  // 出版物冲突保留后端原文（含版本号信息）
      : serverMessage || CATEGORY_MESSAGES[category]

  return {
    category: isPublicationConflict ? "conflict" : category,
    userMessage,
    retryable: CATEGORY_RETRYABLE[category],
    httpStatus,
    apiCode,
    serverMessage,
  }
}

/** 便捷方法：只取用户消息 */
export function getUserErrorMessage(error: unknown, fallback?: string): string {
  const classified = classifyError(error)
  // 对于 classified 中 serverMessage 为空的情况，用 fallback
  if (!classified.serverMessage && fallback) {
    return fallback
  }
  return classified.userMessage
}

/** 是否需要弹窗/强提醒 */
export function isBlockingError(category: ErrorCategory): boolean {
  return category === "auth" || category === "permission" || category === "conflict"
}

/** 是否需要静默 toast */
export function isToastError(category: ErrorCategory): boolean {
  return category === "validation" || category === "not-found" || category === "network"
}

/** 将原始 Axios 错误转为可序列化的简要对象（用于日志/审计） */
export function serializeError(error: unknown): Record<string, unknown> {
  if (!isAxiosLike(error)) {
    return {
      kind: "native",
      message: error instanceof Error ? error.message : String(error ?? ""),
    }
  }
  return {
    kind: "http",
    status: error.response?.status,
    apiCode: error.response?.data?.code,
    message: error.response?.data?.message || error.message,
    url: error.config?.url,
    method: error.config?.method,
  }
}
