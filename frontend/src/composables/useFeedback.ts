import { ref } from 'vue'

export function useFeedback() {
  const statusMessage = ref('')
  const errorMessage = ref('')

  function setStatus(message: string) {
    statusMessage.value = message
    errorMessage.value = ''
  }

  function setError(message: string) {
    errorMessage.value = message
    statusMessage.value = ''
  }

  function dismiss() {
    statusMessage.value = ''
    errorMessage.value = ''
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback
  }

  return {
    statusMessage,
    errorMessage,
    setStatus,
    setError,
    dismiss,
    getErrorMessage,
  }
}
