// src/features/export/useExportState.ts
import { ref } from 'vue'

export interface ExportOptions {
  includeBios: boolean;
  style?: string;
}

export interface ExportData {
  base64Image: string;
  svgMarkup?: string;
  options: ExportOptions;
}

const state = ref<ExportData | null>(null)

export function useExportState() {
  function setExportData(base64Image: string, options: ExportOptions, svgMarkup?: string) {
    state.value = { base64Image, options, svgMarkup }
  }

  function getExportData() {
    return state.value
  }

  function clearExportData() {
    state.value = null
  }

  return { setExportData, getExportData, clearExportData }
}
