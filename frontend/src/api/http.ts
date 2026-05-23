import axios from "axios"
import { clearSession, getAccessToken, setAccessToken } from "./tokenStore"
import { classifyError, getUserErrorMessage } from "./errorClassifier"
import type { ClassifiedError } from "./errorClassifier"

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

http.defaults.xsrfCookieName = "XSRF-TOKEN"
http.defaults.xsrfHeaderName = "X-XSRF-TOKEN"

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

export function shouldRetryAuthRefresh(config: { url?: string }): boolean {
  const url = config.url ?? ""
  return !url.startsWith("/auth/")
}

// ---- 旧版兼容导出（标记为 deprecated，建议用 classifyError） ----

/** @deprecated 请使用 classifyError(error).userMessage 代替 */
export function formatHttpError(error: unknown): string {
  return getUserErrorMessage(error)
}

/** @deprecated 请使用 classifyError 判断 category === "conflict" 代替 */
export function isPublicationConflict(error: unknown): boolean {
  const classified = classifyError(error)
  const url = (error as any)?.config?.url ?? ""
  return classified.category === "conflict" && typeof url === "string" && url.includes("/publications/")
}

// ---- 响应拦截器 ----

http.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const classified = classifyError(error)

    // 409 非出版物冲突 → 派发全局事件
    if (
      classified.category === "conflict" &&
      !((error as any)?.config?.url ?? "").includes("/publications/")
    ) {
      window.dispatchEvent(
        new CustomEvent("concurrency-conflict", {
          detail: { message: classified.userMessage },
        }),
      )
    }

    // 401 → token 刷新
    const original = error.config
    if (classified.category === "auth" && !original._retry && shouldRetryAuthRefresh(original)) {
      original._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = http
            .post<{ data: { token: string } }>("/auth/refresh")
            .then((r) => {
              setAccessToken(r.data.data.token)
              return r.data.data.token
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      } catch {
        clearSession()
        window.location.href = "/login"
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

// ============================================================
// ApiResponse 安全解包工厂
// 统一处理 resp.data.code !== 200 的模式
// ============================================================

/**
 * 检查 Axios 响应中的 ApiResponse.code 是否为 200。
 * 若非 200，抛出带分类信息的 BusinessError。
 */
export class BusinessError extends Error {
  public readonly classified: ClassifiedError

  constructor(classified: ClassifiedError) {
    super(classified.userMessage)
    this.name = "BusinessError"
    this.classified = classified
  }
}

/**
 * 从 Axios 响应中安全提取 data，自动检查 code !== 200。
 *
 * @example
 *   const users = await unwrapApiResponse(http.get<ApiResponse<AdminUser[]>>("/admin/users"))
 */
export async function unwrapApiResponse<T>(
  promise: Promise<{ data: { code: number; message?: string; data: T } }>,
): Promise<T> {
  const resp = await promise
  if (resp.data.code !== 200) {
    const classified: ClassifiedError = {
      category: "unknown",
      userMessage: resp.data.message || "操作失败",
      retryable: true,
      httpStatus: resp.data.code,
      apiCode: resp.data.code,
      serverMessage: resp.data.message,
    }
    throw new BusinessError(classified)
  }
  return resp.data.data
}

export { classifyError, getUserErrorMessage }
export type { ClassifiedError }

export default http
