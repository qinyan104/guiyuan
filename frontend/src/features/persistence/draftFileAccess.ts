export interface DraftFileWritable {
  write(content: string): Promise<void>
  close(): Promise<void>
}

export interface DraftFileHandle {
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<DraftFileWritable>
}

export interface OpenedDraftFile {
  handle: DraftFileHandle
  name: string
  content: string
}

interface DraftFilePickerWindow extends Window {
  showOpenFilePicker?: (options?: unknown) => Promise<DraftFileHandle[]>
  showSaveFilePicker?: (options?: unknown) => Promise<DraftFileHandle>
}

const DRAFT_FILE_PICKER_OPTIONS = {
  types: [
    {
      description: 'Guiyuan draft JSON',
      accept: {
        'application/json': ['.json'],
      },
    },
  ],
  excludeAcceptAllOption: false,
}

function getPickerWindow(): DraftFilePickerWindow {
  return window as DraftFilePickerWindow
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function isNativeDraftFileAccessSupported(): boolean {
  const pickerWindow = getPickerWindow()
  return typeof pickerWindow.showOpenFilePicker === 'function' && typeof pickerWindow.showSaveFilePicker === 'function'
}

export async function openDraftFileWithPicker(): Promise<OpenedDraftFile | null> {
  const pickerWindow = getPickerWindow()
  if (!pickerWindow.showOpenFilePicker) {
    return null
  }

  try {
    const [handle] = await pickerWindow.showOpenFilePicker({
      ...DRAFT_FILE_PICKER_OPTIONS,
      multiple: false,
    })
    if (!handle) {
      return null
    }

    const file = await handle.getFile()
    return {
      handle,
      name: handle.name || file.name,
      content: await file.text(),
    }
  } catch (error) {
    if (isAbortError(error)) {
      return null
    }

    throw error
  }
}

export async function saveDraftFileWithPicker(suggestedName: string, content: string): Promise<DraftFileHandle | null> {
  const pickerWindow = getPickerWindow()
  if (!pickerWindow.showSaveFilePicker) {
    return null
  }

  try {
    const handle = await pickerWindow.showSaveFilePicker({
      ...DRAFT_FILE_PICKER_OPTIONS,
      suggestedName,
    })
    await writeDraftFile(handle, content)
    return handle
  } catch (error) {
    if (isAbortError(error)) {
      return null
    }

    throw error
  }
}

export async function writeDraftFile(handle: DraftFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}
