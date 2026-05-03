import { defaultSettings } from '../../data/sampleFamily'
import {
  DRAFT_PACKAGE_VERSION,
  type DraftPackage,
  type LocalDraftState,
  type PublicationData,
  type PublicationSettings,
  type ValidationIssue,
  type ValidationResult,
} from '../../types/family'
import { normalizePublicationData, normalizeSettings, validatePublicationData, validateSettings } from '../validation/draftSchema'

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function issue(code: ValidationIssue['code'], path: string, message: string): ValidationIssue {
  return { code, path, message }
}

function mergeSettings(input: unknown): PublicationSettings {
  return {
    ...defaultSettings,
    ...(isRecord(input) ? input : {}),
  } as PublicationSettings
}

function parseJson(raw: string): ValidationResult<unknown> {
  try {
    return {
      ok: true,
      value: JSON.parse(raw) as unknown,
    }
  } catch {
    return {
      ok: false,
      issues: [issue('invalid-json', 'json', 'JSON 格式错误，无法解析。')],
    }
  }
}

function coerceDraftPackage(input: unknown, savedAt = new Date().toISOString()): ValidationResult<DraftPackage> {
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [issue('invalid-root', 'draft', '导入内容必须是对象。')],
    }
  }

  const usesWrappedPublication = isRecord(input.publication)
  const rawPublication = usesWrappedPublication ? input.publication : input
  const rawSettings = usesWrappedPublication ? input.settings : defaultSettings
  const version = usesWrappedPublication ? input.version ?? DRAFT_PACKAGE_VERSION : DRAFT_PACKAGE_VERSION

  if (version !== DRAFT_PACKAGE_VERSION) {
    return {
      ok: false,
      issues: [issue('unsupported-draft-version', 'version', `不支持的草稿版本：${String(version)}。`)],
    }
  }

  const publicationIssues = validatePublicationData(rawPublication)
  const settings = normalizeSettings(mergeSettings(rawSettings))
  const settingsIssues = validateSettings(settings)
  const issues = [...publicationIssues, ...settingsIssues]

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    }
  }

  return {
    ok: true,
    value: {
      version: DRAFT_PACKAGE_VERSION,
      savedAt: typeof input.savedAt === 'string' ? input.savedAt : savedAt,
      publication: normalizePublicationData(cloneJson(rawPublication as PublicationData)),
      settings: cloneJson(settings),
    },
  }
}

export function createDraftPackage(
  publication: PublicationData,
  settings: PublicationSettings,
  savedAt = new Date().toISOString(),
): DraftPackage {
  return {
    version: DRAFT_PACKAGE_VERSION,
    savedAt,
    publication: normalizePublicationData(cloneJson(publication)),
    settings: normalizeSettings(mergeSettings(cloneJson(settings))),
  }
}

export function serializeDraftPackage(draft: DraftPackage): string {
  return JSON.stringify(draft, null, 2)
}

/**
 * 将族谱数据转换为便携格式：将所有 /api/photos/ 链接替换为 Base64 编码的图片数据
 */
export async function createPortablePublication(publication: PublicationData): Promise<PublicationData> {
  const next = JSON.parse(JSON.stringify(publication)) as PublicationData
  const people = Object.values(next.people)

  const tasks = people.map(async (person) => {
    if (person.avatarUrl && isPortablePhotoUrl(person.avatarUrl)) {
      try {
        const response = await fetch(person.avatarUrl)
        if (!response.ok) return
        
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        person.avatarUrl = base64
      } catch (e) {
        console.error(`无法转换图片为 Base64 (person: ${person.name}):`, e)
      }
    }
  })

  await Promise.all(tasks)
  return next
}

function isPortablePhotoUrl(avatarUrl: string): boolean {
  return (
    avatarUrl.startsWith('/api/photos/') ||
    avatarUrl.startsWith('/uploads/') ||
    avatarUrl.startsWith('uploads/') ||
    avatarUrl.includes('/uploads/')
  )
}

export function parseDraftJson(raw: string): ValidationResult<DraftPackage> {
  const parsed = parseJson(raw)
  if (!parsed.ok) {
    return parsed
  }

  return coerceDraftPackage(parsed.value)
}

export function serializeLocalDraftState(
  publication: PublicationData,
  settings: PublicationSettings,
  selectedPersonId?: string,
  savedAt = new Date().toISOString(),
): string {
  const draft = createDraftPackage(publication, settings, savedAt)
  const localDraft: LocalDraftState = {
    ...draft,
  }

  if (selectedPersonId && draft.publication.people[selectedPersonId]) {
    localDraft.selectedPersonId = selectedPersonId
  }

  return JSON.stringify(localDraft)
}

export function parseLocalDraftState(raw: string): ValidationResult<LocalDraftState> {
  const parsed = parseJson(raw)
  if (!parsed.ok) {
    return parsed
  }

  const draft = coerceDraftPackage(parsed.value)
  if (!draft.ok) {
    return draft
  }

  const selectedPersonId =
    isRecord(parsed.value) &&
    typeof parsed.value.selectedPersonId === 'string' &&
    draft.value.publication.people[parsed.value.selectedPersonId]
      ? parsed.value.selectedPersonId
      : undefined

  return {
    ok: true,
    value: {
      ...draft.value,
      ...(selectedPersonId ? { selectedPersonId } : {}),
    },
  }
}
