import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { wxLogin, logout, isLoggedIn } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<number | null>(null)
  const username = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loggedIn = computed(() => isLoggedIn())

  function restoreSession() {
    userId.value = uni.getStorageSync('userId') || null
    username.value = uni.getStorageSync('username') || ''
  }

  async function login() {
    loading.value = true
    error.value = null
    try {
      const result = await wxLogin()
      userId.value = result.userId
      username.value = result.username
    } catch (err: any) {
      error.value = err.message || '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function doLogout() {
    logout()
    userId.value = null
    username.value = ''
  }

  return { userId, username, loading, error, loggedIn, restoreSession, login, doLogout }
})
