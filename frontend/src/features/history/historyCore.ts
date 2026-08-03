import type { PublicationData, PublicationSettings } from '../../types/family'

export interface EditorSnapshot {
  publication: PublicationData
  settings: PublicationSettings
  selectedPersonId: string
}

export interface HistoryEntry {
  id: string
  label: string
  time: string
  snapshot: EditorSnapshot
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function formatHistoryTime(date = new Date()): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function serializeTrackedSnapshot(snapshot: EditorSnapshot): string {
  return serializeTrackedState(snapshot.publication, snapshot.settings)
}

export function serializeTrackedState(publication: PublicationData, settings: PublicationSettings): string {
  return JSON.stringify({
    publication: Object.fromEntries(Object.entries(publication).filter(([key]) => key !== 'revision')),
    settings: Object.fromEntries(Object.entries(settings).filter(([key]) => key !== 'zoom')),
  })
}

export function inferHistoryLabel(previousSnapshot: EditorSnapshot, currentSnapshot: EditorSnapshot, pendingLabel = ''): string {
  if (pendingLabel) {
    return pendingLabel
  }

  if (JSON.stringify(previousSnapshot.publication) !== JSON.stringify(currentSnapshot.publication)) {
    const person =
      currentSnapshot.publication.people[currentSnapshot.selectedPersonId] ??
      previousSnapshot.publication.people[previousSnapshot.selectedPersonId]

    return person ? `编辑 ${person.name} 信息` : '编辑人物关系'
  }

  return '调整版式设置'
}
