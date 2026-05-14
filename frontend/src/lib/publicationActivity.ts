const PUBLICATION_ACTIVITY_LABELS: Record<string, string> = {
  CREATE_PUB: '创建族谱',
  UPDATE_PUB: '保存族谱',
  UPDATE_PUB_META: '修改信息',
  UPDATE_PERSON: '编辑人物',
  DELETE_PUB: '删除族谱',
}

export function getPublicationActivityLabel(action?: string | null): string {
  if (!action) return ''
  return PUBLICATION_ACTIVITY_LABELS[action] || action
}
