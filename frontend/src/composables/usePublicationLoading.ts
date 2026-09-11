import { computed, nextTick, ref, type Ref } from 'vue'
import type { PublicationDownloadProgress } from '../api/publication'

const INITIAL_PROGRESS = 10
const DOWNLOAD_PROGRESS_RANGE = 60
const LARGE_PUBLICATION_BYTES = 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 集中管理族谱加载遮罩的进度、阶段文案和下载反馈。
 * 视图只需要消费状态并报告下载事件，不再持有进度计算细节。
 */
export function usePublicationLoading() {
  const loadingProgress = ref(INITIAL_PROGRESS)
  const loadingStageText = ref('正在读取宗谱档案...')
  const isLargeDataDetected = ref(false)
  const downloadedBytes = ref(0)
  const downloadTotalBytes = ref<number | null>(null)
  const isDownloadIndeterminate = computed(() => downloadTotalBytes.value === null && loadingProgress.value < 70)
  const loadingProgressLabel = computed(() => {
    if (!isDownloadIndeterminate.value) return `${Math.round(loadingProgress.value)}%`
    return downloadedBytes.value > 0 ? formatBytes(downloadedBytes.value) : '连接中'
  })

  function reset() {
    loadingProgress.value = INITIAL_PROGRESS
    loadingStageText.value = '正在读取宗谱档案...'
    isLargeDataDetected.value = false
    downloadedBytes.value = 0
    downloadTotalBytes.value = null
  }

  function reportDownloadProgress(event: PublicationDownloadProgress) {
    downloadedBytes.value = Math.max(0, event.loaded)
    if (event.total && event.total > 0) {
      downloadTotalBytes.value = event.total
      loadingProgress.value = INITIAL_PROGRESS + Math.min(1, event.loaded / event.total) * DOWNLOAD_PROGRESS_RANGE
      loadingStageText.value = `正在接收族谱数据 ${formatBytes(event.loaded)} / ${formatBytes(event.total)}`
      isLargeDataDetected.value = event.total >= LARGE_PUBLICATION_BYTES
    } else {
      downloadTotalBytes.value = null
      loadingStageText.value = `已接收 ${formatBytes(event.loaded)}，正在读取族谱数据...`
      isLargeDataDetected.value = event.loaded >= LARGE_PUBLICATION_BYTES
    }
  }

  async function paintStage(isOverlayVisible: Ref<boolean>) {
    await nextTick()
    if (isOverlayVisible.value && import.meta.env.MODE !== 'test') {
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
  }

  return {
    loadingProgress,
    loadingStageText,
    isLargeDataDetected,
    downloadedBytes,
    downloadTotalBytes,
    isDownloadIndeterminate,
    loadingProgressLabel,
    reset,
    reportDownloadProgress,
    paintStage,
  }
}
