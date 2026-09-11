import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useBackToTop(threshold = 400) {
  const visible = ref(false)
  const onScroll = () => {
    visible.value = window.scrollY > threshold
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

  return { visible, scrollToTop }
}
