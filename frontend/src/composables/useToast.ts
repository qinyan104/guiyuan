import { readonly, ref } from 'vue'

export type ToastType = 'success' | 'error'

export interface ToastMessage {
  message: string
  type: ToastType
}

const toast = ref<ToastMessage | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function showToast(message: string, type: ToastType = 'success') {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = { message, type }
    toastTimer = setTimeout(() => { toast.value = null }, 2800)
  }

  return {
    toast: readonly(toast),
    showToast,
  }
}
