import type {
  FamilyUnit,
  Gender,
  Person,
  PublicationData,
  PublicationPaper,
  PublicationSettings,
  ValidationIssue,
} from '../../types/family'

const GENDERS = new Set<Gender>(['male', 'female', 'unknown'])
const PAPERS = new Set<PublicationPaper>(['A3', 'A4'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function issue(code: ValidationIssue['code'], path: string, message: string): ValidationIssue {
  return { code, path, message }
}

function validatePerson(personId: string, value: unknown): ValidationIssue[] {
  if (!isRecord(value)) {
    return [issue('invalid-person', `people.${personId}`, `人物 ${personId} 必须是对象。`)]
  }

  const person = value as Partial<Person>
  const issues: ValidationIssue[] = []

  if (person.id !== personId) {
    issues.push(issue('invalid-person', `people.${personId}.id`, `人物 ${personId} 的 id 必须与键名一致。`))
  }

  if (!isString(person.name) || !person.name.trim()) {
    issues.push(issue('invalid-person', `people.${personId}.name`, `人物 ${personId} 缺少姓名。`))
  }

  if (!isString(person.gender) || !GENDERS.has(person.gender as Gender)) {
    issues.push(issue('invalid-person', `people.${personId}.gender`, `人物 ${personId} 的性别值无效。`))
  }

  ;(['birth', 'death', 'age', 'note'] as const).forEach((field) => {
    if (!isOptionalString(person[field])) {
      issues.push(issue('invalid-person', `people.${personId}.${field}`, `人物 ${personId} 的 ${field} 必须是字符串。`))
    }
  })

  return issues
}

function validateMemberIds(
  familyId: string,
  label: 'adults' | 'children',
  members: unknown,
  people: Record<string, unknown>,
): ValidationIssue[] {
  if (!Array.isArray(members)) {
    return [issue('invalid-family', `families.${familyId}.${label}`, `家庭 ${familyId} 缺少 ${label} 数组。`)]
  }

  const seen = new Set<string>()
  const issues: ValidationIssue[] = []

  members.forEach((memberId, index) => {
    const path = `families.${familyId}.${label}[${index}]`
    if (!isString(memberId) || !memberId) {
      issues.push(issue('invalid-family', path, `家庭 ${familyId} 的成员 ID 必须是非空字符串。`))
      return
    }

    if (!people[memberId]) {
      issues.push(issue('missing-person-reference', path, `家庭 ${familyId} 引用了不存在的人物 ${memberId}。`))
    }

    if (seen.has(memberId)) {
      issues.push(issue('duplicate-family-member', path, `人物 ${memberId} 在家庭 ${familyId} 中重复出现。`))
    }

    seen.add(memberId)
  })

  return issues
}

function validateFamily(familyId: string, value: unknown, people: Record<string, unknown>): ValidationIssue[] {
  if (!isRecord(value)) {
    return [issue('invalid-family', `families.${familyId}`, `家庭 ${familyId} 必须是对象。`)]
  }

  const family = value as Partial<FamilyUnit>
  const issues: ValidationIssue[] = []

  if (family.id !== familyId) {
    issues.push(issue('invalid-family', `families.${familyId}.id`, `家庭 ${familyId} 的 id 必须与键名一致。`))
  }

  issues.push(...validateMemberIds(familyId, 'adults', family.adults, people))
  issues.push(...validateMemberIds(familyId, 'children', family.children, people))

  if (Array.isArray(family.adults) && Array.isArray(family.children)) {
    const adults = new Set(family.adults.filter((memberId): memberId is string => isString(memberId) && memberId.length > 0))

    family.children.forEach((memberId, index) => {
      if (isString(memberId) && adults.has(memberId)) {
        issues.push(
          issue(
            'duplicate-family-member',
            `families.${familyId}.children[${index}]`,
            `人物 ${memberId} 不能同时作为家庭 ${familyId} 的父母和子女。`,
          ),
        )
      }
    })
  }

  return issues
}

export function validatePublicationData(input: unknown): ValidationIssue[] {
  if (!isRecord(input)) {
    return [issue('invalid-root', 'publication', '族谱数据必须是对象。')]
  }

  const publication = input as Partial<PublicationData>
  const issues: ValidationIssue[] = []

  if (!isString(publication.title)) {
    issues.push(issue('invalid-root', 'title', '族谱标题必须是字符串。'))
  }

  if (!isString(publication.subtitle)) {
    issues.push(issue('invalid-root', 'subtitle', '族谱副标题必须是字符串。'))
  }

  if (!isString(publication.focusFamilyId)) {
    issues.push(issue('invalid-root', 'focusFamilyId', '当前宗支 ID 必须是字符串。'))
  }

  if (!isRecord(publication.people)) {
    issues.push(issue('missing-people', 'people', '族谱数据缺少 people 对象。'))
  }

  if (!isRecord(publication.families)) {
    issues.push(issue('missing-families', 'families', '族谱数据缺少 families 对象。'))
  }

  if (!isRecord(publication.people) || !isRecord(publication.families)) {
    return issues
  }

  Object.entries(publication.people).forEach(([personId, person]) => {
    issues.push(...validatePerson(personId, person))
  })

  Object.entries(publication.families).forEach(([familyId, family]) => {
    issues.push(...validateFamily(familyId, family, publication.people as Record<string, unknown>))
  })

  if (isString(publication.focusFamilyId) && !publication.families[publication.focusFamilyId]) {
    issues.push(issue('missing-focus-family', 'focusFamilyId', `当前宗支 ${publication.focusFamilyId} 不存在。`))
  }

  return issues
}

export function normalizePublicationData(publication: PublicationData): PublicationData {
  const next = JSON.parse(JSON.stringify(publication)) as PublicationData

  Object.values(next.families).forEach((family) => {
    const adultIds = new Set<string>()
    const childIds = new Set<string>()

    family.adults = family.adults.filter((personId) => {
      if (!next.people[personId] || adultIds.has(personId)) {
        return false
      }

      adultIds.add(personId)
      return true
    })

    family.children = family.children.filter((personId) => {
      if (!next.people[personId] || adultIds.has(personId) || childIds.has(personId)) {
        return false
      }

      childIds.add(personId)
      return true
    })
  })

  if (!next.families[next.focusFamilyId]) {
    next.focusFamilyId = Object.keys(next.families)[0] ?? ''
  }

  return next
}

export function validateSettings(input: unknown): ValidationIssue[] {
  if (!isRecord(input)) {
    return [issue('missing-settings', 'settings', '排版设置必须是对象。')]
  }

  const settings = input as Partial<PublicationSettings>
  const issues: ValidationIssue[] = []

  if (!isString(settings.paper) || !PAPERS.has(settings.paper as PublicationPaper)) {
    issues.push(issue('invalid-settings', 'settings.paper', '纸张尺寸必须是 A3 或 A4。'))
  }

  ;(['cardWidth', 'generationGap', 'siblingGap', 'partnerGap', 'fontScale', 'zoom', 'paddingX', 'paddingY'] as const).forEach(
    (field) => {
      if (typeof settings[field] !== 'number' || !Number.isFinite(settings[field])) {
        issues.push(issue('invalid-settings', `settings.${field}`, `${field} 必须是数字。`))
      }
    },
  )

  ;(['showDeath', 'showAge', 'showNote'] as const).forEach((field) => {
    if (typeof settings[field] !== 'boolean') {
      issues.push(issue('invalid-settings', `settings.${field}`, `${field} 必须是布尔值。`))
    }
  })

  return issues
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.map((entry) => `${entry.path}: ${entry.message}`).join('\n')
}
