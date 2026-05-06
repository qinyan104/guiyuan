// src/features/export/useExportState.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useExportState } from './useExportState'

describe('useExportState', () => {
  beforeEach(() => {
    const { clearExportData } = useExportState()
    clearExportData()
  })

  it('stores and retrieves export data', () => {
    const { setExportData, getExportData } = useExportState()
    setExportData('base64data', { includeBios: true })
    const data = getExportData()
    expect(data?.base64Image).toBe('base64data')
    expect(data?.options.includeBios).toBe(true)
  })
})
