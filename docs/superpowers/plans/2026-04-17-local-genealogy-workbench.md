# Local Genealogy Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Vue prototype into a locally self-contained genealogy workbench with JSON import/export, validated draft persistence, unified relationship operations, and a smaller `App.vue`.

**Architecture:** Extract the monolithic `src/App.vue` responsibilities into feature modules for validation, persistence, relationship operations, and history. Keep `src/lib/layout.ts` as the pure layout engine and let the UI consume validated draft state plus explicit operation results.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, localStorage, browser File API, SVG export

---

## Repository Note

The current workspace is not a Git repository. Before the first commit step, run:

```powershell
git init
git add .
git commit -m "chore: capture existing genealogy workbench"
```

After that, follow the commit step at the end of each task.

## File Structure

- Modify: `package.json`
  Add Vitest scripts and dev dependency.
- Create: `vitest.config.ts`
  Configure node-based unit tests for pure TypeScript modules.
- Modify: `src/types/family.ts`
  Add draft package, local draft, validation, and operation result types.
- Create: `src/features/validation/draftSchema.ts`
  Validate and normalize `PublicationData`.
- Create: `src/features/validation/draftSchema.test.ts`
  Protect core structure validation.
- Create: `src/features/persistence/draftPersistence.ts`
  Parse, serialize, and version draft packages.
- Create: `src/features/persistence/draftPersistence.test.ts`
  Protect JSON import/export round trips.
- Create: `src/features/editor/publicationOperations.ts`
  Centralize relationship mutations.
- Create: `src/features/editor/publicationOperations.test.ts`
  Protect relationship cleanup, ordering, and conflict rules.
- Create: `src/features/history/useEditorHistory.ts`
  Move history snapshot, undo, redo, and tracking behavior out of `App.vue`.
- Create: `src/features/history/historyCore.ts`
  Keep pure history helpers testable.
- Create: `src/features/history/historyCore.test.ts`
  Protect zoom-insensitive history tracking and labels.
- Modify: `src/App.vue:1-1053`
  Replace inline persistence, history, and relationship mutation logic with feature module calls.
- Modify: `src/App.vue:1055-1382`
  Add JSON import/export controls and error display while preserving existing canvas/editor UI.
- Modify: `src/style.css`
  Add styles for import/export actions and error panels.

---

### Task 1: Test Harness And Domain Validation

**Files:**

- Modify: `package.json:6-20`
- Create: `vitest.config.ts`
- Modify: `src/types/family.ts:1-69`
- Create: `src/features/validation/draftSchema.ts`
- Test: `src/features/validation/draftSchema.test.ts`

- [ ] **Step 1: Add Vitest wiring and a failing validation test**

Modify `package.json` so the scripts and dev dependencies contain these exact additions:

```diff
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
-   "preview": "vite preview"
+   "preview": "vite preview",
+   "test": "vitest run",
+   "test:watch": "vitest"
  },
```

```diff
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "@types/node": "^22.10.6",
    "typescript": "^5.7.2",
    "vite": "^6.0.11",
+   "vitest": "^3.2.4",
    "vue-tsc": "^2.2.0"
  }
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

Create `src/features/validation/draftSchema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { samplePublication } from '../../data/sampleFamily'
import { validatePublicationData } from './draftSchema'

describe('validatePublicationData', () => {
  it('accepts the bundled sample publication', () => {
    expect(validatePublicationData(samplePublication)).toEqual([])
  })

  it('rejects a focus family that does not exist', () => {
    const brokenPublication = {
      ...samplePublication,
      focusFamilyId: 'missing-family',
    }

    expect(validatePublicationData(brokenPublication)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-focus-family',
          path: 'focusFamilyId',
        }),
      ]),
    )
  })

  it('rejects a family that references a missing person', () => {
    const brokenPublication = {
      ...samplePublication,
      families: {
        ...samplePublication.families,
        f1: {
          ...samplePublication.families.f1,
          children: [...samplePublication.families.f1.children, 'missing-person'],
        },
      },
    }

    expect(validatePublicationData(brokenPublication)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-person-reference',
          path: 'families.f1.children[3]',
        }),
      ]),
    )
  })
})
```

- [ ] **Step 2: Install and run the failing test**

Run:

```powershell
npm.cmd install
npm.cmd run test -- src/features/validation/draftSchema.test.ts
```

Expected: `npm install` completes, then the test run fails because `src/features/validation/draftSchema.ts` does not exist.

- [ ] **Step 3: Add the domain types and validation implementation**

Append these exports to `src/types/family.ts` after `PublicationLayout`:

```ts
export const DRAFT_PACKAGE_VERSION = 1

export interface DraftPackage {
  version: typeof DRAFT_PACKAGE_VERSION
  savedAt: string
  publication: PublicationData
  settings: PublicationSettings
}

export interface LocalDraftState extends DraftPackage {
  selectedPersonId?: string
}

export type ValidationIssueCode =
  | 'invalid-json'
  | 'invalid-root'
  | 'missing-publication'
  | 'missing-settings'
  | 'missing-people'
  | 'missing-families'
  | 'missing-focus-family'
  | 'invalid-person'
  | 'invalid-family'
  | 'missing-person-reference'
  | 'duplicate-family-member'
  | 'invalid-settings'
  | 'unsupported-draft-version'
  | 'operation-conflict'

export interface ValidationIssue {
  code: ValidationIssueCode
  message: string
  path: string
}

export type ValidationResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

export interface PublicationOperationPayload {
  publication: PublicationData
  selectedPersonId: string
  focusFamilyId: string
  historyLabel: string
}

export type PublicationOperationResult = ValidationResult<PublicationOperationPayload>
```

Create `src/features/validation/draftSchema.ts`:

```ts
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
const PAPERS = new Set<PublicationPaper>(['A4', 'A3'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function issue(code: ValidationIssue['code'], path: string, message: string): ValidationIssue {
  return { code, path, message }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
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

function validateFamily(familyId: string, value: unknown, people: Record<string, unknown>): ValidationIssue[] {
  if (!isRecord(value)) {
    return [issue('invalid-family', `families.${familyId}`, `家庭 ${familyId} 必须是对象。`)]
  }

  const family = value as Partial<FamilyUnit>
  const issues: ValidationIssue[] = []

  if (family.id !== familyId) {
    issues.push(issue('invalid-family', `families.${familyId}.id`, `家庭 ${familyId} 的 id 必须与键名一致。`))
  }

  if (!Array.isArray(family.adults)) {
    issues.push(issue('invalid-family', `families.${familyId}.adults`, `家庭 ${familyId} 缺少 adults 数组。`))
  }

  if (!Array.isArray(family.children)) {
    issues.push(issue('invalid-family', `families.${familyId}.children`, `家庭 ${familyId} 缺少 children 数组。`))
  }

  const memberPaths: Array<{ id: unknown; path: string }> = [
    ...(Array.isArray(family.adults) ? family.adults.map((id, index) => ({ id, path: `families.${familyId}.adults[${index}]` })) : []),
    ...(Array.isArray(family.children) ? family.children.map((id, index) => ({ id, path: `families.${familyId}.children[${index}]` })) : []),
  ]
  const seen = new Set<string>()

  memberPaths.forEach(({ id, path }) => {
    if (!isString(id) || !id) {
      issues.push(issue('invalid-family', path, `家庭 ${familyId} 的成员 ID 必须是非空字符串。`))
      return
    }

    if (!people[id]) {
      issues.push(issue('missing-person-reference', path, `家庭 ${familyId} 引用了不存在的人物 ${id}。`))
    }

    if (seen.has(id)) {
      issues.push(issue('duplicate-family-member', path, `人物 ${id} 在家庭 ${familyId} 中重复出现。`))
    }

    seen.add(id)
  })

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
  const next: PublicationData = JSON.parse(JSON.stringify(publication)) as PublicationData

  Object.values(next.families).forEach((family) => {
    const adults = new Set<string>()
    const children = new Set<string>()

    family.adults = family.adults.filter((personId) => {
      if (!next.people[personId] || adults.has(personId)) {
        return false
      }

      adults.add(personId)
      return true
    })

    family.children = family.children.filter((personId) => {
      if (!next.people[personId] || adults.has(personId) || children.has(personId)) {
        return false
      }

      children.add(personId)
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
  const numericFields: Array<keyof PublicationSettings> = [
    'cardWidth',
    'generationGap',
    'siblingGap',
    'partnerGap',
    'fontScale',
    'zoom',
    'paddingX',
    'paddingY',
  ]
  const booleanFields: Array<keyof PublicationSettings> = ['showDeath', 'showAge', 'showNote']

  if (!isString(settings.paper) || !PAPERS.has(settings.paper as PublicationPaper)) {
    issues.push(issue('invalid-settings', 'settings.paper', '纸张尺寸必须是 A3 或 A4。'))
  }

  numericFields.forEach((field) => {
    if (typeof settings[field] !== 'number' || !Number.isFinite(settings[field])) {
      issues.push(issue('invalid-settings', `settings.${field}`, `${field} 必须是数字。`))
    }
  })

  booleanFields.forEach((field) => {
    if (typeof settings[field] !== 'boolean') {
      issues.push(issue('invalid-settings', `settings.${field}`, `${field} 必须是布尔值。`))
    }
  })

  return issues
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.map((item) => `${item.path}: ${item.message}`).join('\n')
}
```

- [ ] **Step 4: Run validation tests**

Run:

```powershell
npm.cmd run test -- src/features/validation/draftSchema.test.ts
```

Expected: PASS, with 3 tests passing.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts src/types/family.ts src/features/validation/draftSchema.ts src/features/validation/draftSchema.test.ts
git commit -m "feat: add draft validation foundation"
```

---

### Task 2: Draft Persistence And JSON Round Trip

**Files:**

- Create: `src/features/persistence/draftPersistence.ts`
- Test: `src/features/persistence/draftPersistence.test.ts`
- Modify: `src/types/family.ts:71-132`

- [ ] **Step 1: Write failing persistence tests**

Create `src/features/persistence/draftPersistence.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../../data/sampleFamily'
import { DRAFT_PACKAGE_VERSION } from '../../types/family'
import {
  createDraftPackage,
  parseDraftJson,
  parseLocalDraftState,
  serializeDraftPackage,
  serializeLocalDraftState,
} from './draftPersistence'

describe('draft persistence', () => {
  it('serializes and parses a draft package', () => {
    const draft = createDraftPackage(samplePublication, defaultSettings, '2026-04-17T00:00:00.000Z')
    const parsed = parseDraftJson(serializeDraftPackage(draft))

    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        version: DRAFT_PACKAGE_VERSION,
        savedAt: '2026-04-17T00:00:00.000Z',
        publication: expect.objectContaining({ focusFamilyId: samplePublication.focusFamilyId }),
        settings: expect.objectContaining({ paper: defaultSettings.paper }),
      }),
    })
  })

  it('rejects malformed JSON with a readable issue', () => {
    expect(parseDraftJson('{broken')).toEqual({
      ok: false,
      issues: [
        {
          code: 'invalid-json',
          path: 'json',
          message: 'JSON 格式错误，无法解析。',
        },
      ],
    })
  })

  it('preserves selected person for local draft state only when the person exists', () => {
    const state = serializeLocalDraftState(samplePublication, defaultSettings, 'p3', '2026-04-17T00:00:00.000Z')
    const parsed = parseLocalDraftState(state)

    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        selectedPersonId: 'p3',
      }),
    })
  })
})
```

- [ ] **Step 2: Run the failing persistence tests**

Run:

```powershell
npm.cmd run test -- src/features/persistence/draftPersistence.test.ts
```

Expected: FAIL because `draftPersistence.ts` does not exist.

- [ ] **Step 3: Implement draft persistence**

Create `src/features/persistence/draftPersistence.ts`:

```ts
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
import { normalizePublicationData, validatePublicationData, validateSettings } from '../validation/draftSchema'

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

  const rawPublication = isRecord(input.publication) ? input.publication : input
  const rawSettings = isRecord(input.publication) ? input.settings : defaultSettings
  const version = input.version ?? DRAFT_PACKAGE_VERSION

  if (version !== DRAFT_PACKAGE_VERSION) {
    return {
      ok: false,
      issues: [issue('unsupported-draft-version', 'version', `不支持的草稿版本：${String(version)}。`)],
    }
  }

  const publicationIssues = validatePublicationData(rawPublication)
  const settings = mergeSettings(rawSettings)
  const settingsIssues = validateSettings(settings)
  const issues = [...publicationIssues, ...settingsIssues]

  if (issues.length) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    value: {
      version: DRAFT_PACKAGE_VERSION,
      savedAt: typeof input.savedAt === 'string' ? input.savedAt : savedAt,
      publication: normalizePublicationData(rawPublication as PublicationData),
      settings,
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
    publication: normalizePublicationData(publication),
    settings: {
      ...settings,
    },
  }
}

export function serializeDraftPackage(draft: DraftPackage): string {
  return JSON.stringify(draft, null, 2)
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
  selectedPersonId: string,
  savedAt = new Date().toISOString(),
): string {
  const draft = createDraftPackage(publication, settings, savedAt)
  const state: LocalDraftState = {
    ...draft,
    selectedPersonId: publication.people[selectedPersonId] ? selectedPersonId : undefined,
  }

  return JSON.stringify(state)
}

export function parseLocalDraftState(raw: string | null): ValidationResult<LocalDraftState> {
  if (!raw) {
    return {
      ok: false,
      issues: [issue('invalid-root', 'localStorage', '没有可恢复的本地草稿。')],
    }
  }

  const parsed = parseJson(raw)
  if (!parsed.ok) {
    return parsed
  }

  const draft = coerceDraftPackage(parsed.value)
  if (!draft.ok) {
    return draft
  }

  const selectedPersonId =
    isRecord(parsed.value) && typeof parsed.value.selectedPersonId === 'string' && draft.value.publication.people[parsed.value.selectedPersonId]
      ? parsed.value.selectedPersonId
      : undefined

  return {
    ok: true,
    value: {
      ...draft.value,
      selectedPersonId,
    },
  }
}
```

- [ ] **Step 4: Run persistence and validation tests**

Run:

```powershell
npm.cmd run test -- src/features/validation/draftSchema.test.ts src/features/persistence/draftPersistence.test.ts
```

Expected: PASS, with validation and persistence tests passing.

- [ ] **Step 5: Commit**

```powershell
git add src/features/persistence/draftPersistence.ts src/features/persistence/draftPersistence.test.ts
git commit -m "feat: add draft import export persistence"
```

---

### Task 3: Unified Relationship Operation Layer

**Files:**

- Create: `src/features/editor/publicationOperations.ts`
- Test: `src/features/editor/publicationOperations.test.ts`

- [ ] **Step 1: Write failing relationship operation tests**

Create `src/features/editor/publicationOperations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { samplePublication } from '../../data/sampleFamily'
import { applyRelationshipAction, summarizeDeleteImpact } from './publicationOperations'

describe('publication relationship operations', () => {
  it('moves a child and preserves the rest of the child order', () => {
    const result = applyRelationshipAction(samplePublication, {
      type: 'move-child',
      parentPersonId: 'p4',
      childId: 'p12',
      direction: -1,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.publication.families.f3.children).toEqual(['p10', 'p12', 'p11'])
      expect(result.value.selectedPersonId).toBe('p12')
    }
  })

  it('deletes a person and removes all family references', () => {
    const result = applyRelationshipAction(samplePublication, {
      type: 'delete-person',
      personId: 'p4',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.publication.people.p4).toBeUndefined()
      expect(Object.values(result.value.publication.families).some((family) => family.adults.includes('p4'))).toBe(false)
      expect(Object.values(result.value.publication.families).some((family) => family.children.includes('p4'))).toBe(false)
    }
  })

  it('rejects adding a spouse when a family already has two adults', () => {
    const result = applyRelationshipAction(samplePublication, {
      type: 'add-spouse',
      personId: 'p1',
    })

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'operation-conflict',
          path: 'families.f1.adults',
          message: '当前家庭已经有两位成年人，不能继续新增配偶。',
        },
      ],
    })
  })

  it('summarizes delete impact before destructive confirmation', () => {
    expect(summarizeDeleteImpact(samplePublication, 'p4')).toEqual({
      personName: samplePublication.people.p4.name,
      spouseNames: [samplePublication.people.p9.name],
      childNames: [samplePublication.people.p10.name, samplePublication.people.p11.name, samplePublication.people.p12.name],
      parentNames: [samplePublication.people.p1.name, samplePublication.people.p2.name],
      removedFamilyIds: [],
    })
  })
})
```

- [ ] **Step 2: Run the failing operation tests**

Run:

```powershell
npm.cmd run test -- src/features/editor/publicationOperations.test.ts
```

Expected: FAIL because `publicationOperations.ts` does not exist.

- [ ] **Step 3: Implement relationship operations**

Create `src/features/editor/publicationOperations.ts`:

```ts
import type {
  FamilyUnit,
  Gender,
  Person,
  PublicationData,
  PublicationOperationPayload,
  PublicationOperationResult,
  ValidationIssue,
} from '../../types/family'
import { normalizePublicationData } from '../validation/draftSchema'

export type RelationshipAction =
  | { type: 'add-spouse'; personId: string }
  | { type: 'add-child'; personId: string }
  | { type: 'add-parents'; personId: string }
  | { type: 'remove-spouse'; personId: string }
  | { type: 'remove-parents'; personId: string }
  | { type: 'delete-person'; personId: string }
  | { type: 'move-child'; parentPersonId: string; childId: string; direction: -1 | 1 }
  | { type: 'swap-partners'; personId: string }
  | { type: 'focus-branch'; personId: string }

export interface DeleteImpactSummary {
  personName: string
  spouseNames: string[]
  childNames: string[]
  parentNames: string[]
  removedFamilyIds: string[]
}

function clonePublication(publication: PublicationData): PublicationData {
  return JSON.parse(JSON.stringify(publication)) as PublicationData
}

function issue(path: string, message: string): ValidationIssue {
  return {
    code: 'operation-conflict',
    path,
    message,
  }
}

function fail(path: string, message: string): PublicationOperationResult {
  return {
    ok: false,
    issues: [issue(path, message)],
  }
}

function ok(
  publication: PublicationData,
  selectedPersonId: string,
  focusFamilyId: string,
  historyLabel: string,
): PublicationOperationResult {
  return {
    ok: true,
    value: {
      publication: normalizePublicationData(publication),
      selectedPersonId,
      focusFamilyId,
      historyLabel,
    },
  }
}

function isPersonId(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

function listFamilies(publication: PublicationData): FamilyUnit[] {
  return Object.values(publication.families)
}

function getPersonName(publication: PublicationData, personId: string): string {
  return publication.people[personId]?.name ?? personId
}

function getNextEntityId(publication: PublicationData, prefix: 'p' | 'f'): string {
  const ids = prefix === 'p' ? Object.keys(publication.people) : Object.keys(publication.families)
  const maxId = ids.reduce((max, id) => {
    if (!id.startsWith(prefix)) {
      return max
    }

    const numeric = Number(id.slice(1))
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, 0)

  return `${prefix}${maxId + 1}`
}

function createPerson(publication: PublicationData, input: { name: string; gender: Gender; note?: string }): Person {
  const id = getNextEntityId(publication, 'p')
  const person: Person = {
    id,
    name: input.name,
    gender: input.gender,
    note: input.note,
  }

  publication.people[id] = person
  return person
}

function findAdultFamilyIdForPerson(publication: PublicationData, personId: string): string | undefined {
  return listFamilies(publication).find((family) => family.adults.includes(personId))?.id
}

function findParentFamilyIdForPerson(publication: PublicationData, personId: string): string | undefined {
  return listFamilies(publication).find((family) => family.children.includes(personId))?.id
}

function normalizeFamilyMembers(publication: PublicationData, family: FamilyUnit) {
  const adults: string[] = []
  family.adults.forEach((adultId) => {
    if (isPersonId(adultId) && publication.people[adultId] && !adults.includes(adultId)) {
      adults.push(adultId)
    }
  })

  const children: string[] = []
  family.children.forEach((childId) => {
    if (publication.people[childId] && !adults.includes(childId) && !children.includes(childId)) {
      children.push(childId)
    }
  })

  family.adults = adults
  family.children = children
}

function ensureVisibleFamilyForPerson(publication: PublicationData, personId: string): string | undefined {
  if (!publication.people[personId]) {
    return undefined
  }

  const existingFamilyId = findAdultFamilyIdForPerson(publication, personId)
  if (existingFamilyId) {
    return existingFamilyId
  }

  const familyId = getNextEntityId(publication, 'f')
  publication.families[familyId] = {
    id: familyId,
    adults: [personId],
    children: [],
  }

  return familyId
}

function pruneFamilies(publication: PublicationData) {
  listFamilies(publication).forEach((family) => normalizeFamilyMembers(publication, family))

  listFamilies(publication)
    .filter((family) => family.adults.length === 0)
    .forEach((family) => {
      const orphanChildIds = [...family.children]
      delete publication.families[family.id]
      orphanChildIds.forEach((childId) => ensureVisibleFamilyForPerson(publication, childId))
    })

  listFamilies(publication).forEach((family) => normalizeFamilyMembers(publication, family))
}

function ensureAdultFamily(publication: PublicationData, personId: string): FamilyUnit {
  const existingFamilyId = findAdultFamilyIdForPerson(publication, personId)
  if (existingFamilyId) {
    return publication.families[existingFamilyId]
  }

  const familyId = getNextEntityId(publication, 'f')
  const family: FamilyUnit = {
    id: familyId,
    adults: [personId],
    children: [],
  }

  publication.families[familyId] = family
  return family
}

function chooseFocusFamily(publication: PublicationData, candidates: Array<string | undefined>): string {
  return candidates.find((familyId): familyId is string => Boolean(familyId && publication.families[familyId])) ?? Object.keys(publication.families)[0] ?? ''
}

function choosePerson(publication: PublicationData, candidates: Array<string | undefined>): string {
  return candidates.find((personId): personId is string => Boolean(personId && publication.people[personId])) ?? Object.keys(publication.people)[0] ?? ''
}

export function summarizeDeleteImpact(publication: PublicationData, personId: string): DeleteImpactSummary | null {
  const person = publication.people[personId]
  if (!person) {
    return null
  }

  const adultFamilyId = findAdultFamilyIdForPerson(publication, personId)
  const parentFamilyId = findParentFamilyIdForPerson(publication, personId)
  const adultFamily = adultFamilyId ? publication.families[adultFamilyId] : undefined
  const parentFamily = parentFamilyId ? publication.families[parentFamilyId] : undefined

  return {
    personName: person.name,
    spouseNames: adultFamily?.adults.filter((adultId) => adultId !== personId).map((adultId) => getPersonName(publication, adultId)) ?? [],
    childNames: adultFamily?.children.map((childId) => getPersonName(publication, childId)) ?? [],
    parentNames: parentFamily?.adults.map((adultId) => getPersonName(publication, adultId)) ?? [],
    removedFamilyIds: adultFamily && adultFamily.adults.length === 1 && adultFamily.adults[0] === personId ? [adultFamily.id] : [],
  }
}

export function applyRelationshipAction(publication: PublicationData, action: RelationshipAction): PublicationOperationResult {
  const next = clonePublication(publication)

  if ('personId' in action && !next.people[action.personId]) {
    return fail('people', `人物 ${action.personId} 不存在。`)
  }

  switch (action.type) {
    case 'add-spouse': {
      const person = next.people[action.personId]
      const family = ensureAdultFamily(next, action.personId)
      if (family.adults.filter(isPersonId).length >= 2) {
        return fail(`families.${family.id}.adults`, '当前家庭已经有两位成年人，不能继续新增配偶。')
      }

      const spouseGender: Gender = person.gender === 'male' ? 'female' : person.gender === 'female' ? 'male' : 'unknown'
      const spouse = createPerson(next, { name: '待命名配偶', gender: spouseGender, note: '配偶' })
      family.adults = [action.personId, spouse.id]
      return ok(next, spouse.id, chooseFocusFamily(next, [next.focusFamilyId, family.id]), `新增配偶 ${person.name}`)
    }

    case 'add-child': {
      const person = next.people[action.personId]
      const family = ensureAdultFamily(next, action.personId)
      const child = createPerson(next, { name: '待命名子女', gender: 'unknown', note: '子女' })
      family.children = [...family.children, child.id]
      return ok(next, child.id, chooseFocusFamily(next, [next.focusFamilyId, family.id]), `新增子女 ${person.name}`)
    }

    case 'add-parents': {
      const person = next.people[action.personId]
      const parentFamilyId = findParentFamilyIdForPerson(next, action.personId)
      if (parentFamilyId) {
        const family = next.families[parentFamilyId]
        if (family.adults.filter(isPersonId).length >= 2) {
          return fail(`families.${parentFamilyId}.adults`, '当前人物已经有完整父母关系。')
        }

        const existingParent = family.adults.map((adultId) => next.people[adultId]).find(Boolean)
        const parentGender: Gender = existingParent?.gender === 'male' ? 'female' : existingParent?.gender === 'female' ? 'male' : 'unknown'
        const parent = createPerson(next, {
          name: parentGender === 'male' ? '待命名父亲' : parentGender === 'female' ? '待命名母亲' : '待命名父母',
          gender: parentGender,
          note: parentGender === 'male' ? '父亲' : parentGender === 'female' ? '母亲' : '父母',
        })
        family.adults = parentGender === 'male' ? [parent.id, ...family.adults] : [...family.adults, parent.id]
        return ok(next, parent.id, chooseFocusFamily(next, [parentFamilyId]), `补全父母 ${person.name}`)
      }

      const father = createPerson(next, { name: '待命名父亲', gender: 'male', note: '父亲' })
      const mother = createPerson(next, { name: '待命名母亲', gender: 'female', note: '母亲' })
      const familyId = getNextEntityId(next, 'f')
      next.families[familyId] = {
        id: familyId,
        adults: [father.id, mother.id],
        children: [person.id],
      }
      return ok(next, father.id, familyId, `新增父母 ${person.name}`)
    }

    case 'remove-spouse': {
      const familyId = findAdultFamilyIdForPerson(next, action.personId)
      if (!familyId) {
        return fail('families', '当前人物没有配偶关系可解除。')
      }

      const family = next.families[familyId]
      const spouseId = family.adults.find((adultId) => adultId !== action.personId)
      if (!spouseId) {
        return fail(`families.${familyId}.adults`, '当前人物没有配偶关系可解除。')
      }

      family.adults = family.adults.filter((adultId) => adultId !== spouseId)
      ensureVisibleFamilyForPerson(next, spouseId)
      pruneFamilies(next)
      return ok(next, action.personId, chooseFocusFamily(next, [next.focusFamilyId, familyId]), `解除配偶关系 ${getPersonName(next, action.personId)}`)
    }

    case 'remove-parents': {
      const familyId = findParentFamilyIdForPerson(next, action.personId)
      if (!familyId) {
        return fail('families', '当前人物没有父母关系可解除。')
      }

      const family = next.families[familyId]
      family.children = family.children.filter((childId) => childId !== action.personId)
      const ownFamilyId = ensureVisibleFamilyForPerson(next, action.personId)
      pruneFamilies(next)
      return ok(next, action.personId, chooseFocusFamily(next, [ownFamilyId, next.focusFamilyId, familyId]), `解除父母关系 ${getPersonName(next, action.personId)}`)
    }

    case 'delete-person': {
      const person = next.people[action.personId]
      const impact = summarizeDeleteImpact(next, action.personId)
      const candidateIds = [
        ...(impact?.spouseNames ?? []).map((name) => Object.values(next.people).find((candidate) => candidate.name === name)?.id),
        ...(impact?.childNames ?? []).map((name) => Object.values(next.people).find((candidate) => candidate.name === name)?.id),
        ...(impact?.parentNames ?? []).map((name) => Object.values(next.people).find((candidate) => candidate.name === name)?.id),
      ]

      listFamilies(next).forEach((family) => {
        family.adults = family.adults.filter((adultId) => adultId !== action.personId)
        family.children = family.children.filter((childId) => childId !== action.personId)
      })
      delete next.people[action.personId]
      pruneFamilies(next)
      return ok(next, choosePerson(next, candidateIds), chooseFocusFamily(next, [next.focusFamilyId]), `删除人物 ${person.name}`)
    }

    case 'move-child': {
      const familyId = findAdultFamilyIdForPerson(next, action.parentPersonId)
      if (!familyId) {
        return fail('families', '当前人物没有可排序的子女。')
      }

      const family = next.families[familyId]
      const currentIndex = family.children.indexOf(action.childId)
      const nextIndex = currentIndex + action.direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= family.children.length) {
        return fail(`families.${familyId}.children`, '子女顺序调整超出范围。')
      }

      const children = [...family.children]
      ;[children[currentIndex], children[nextIndex]] = [children[nextIndex], children[currentIndex]]
      family.children = children
      return ok(next, action.childId, chooseFocusFamily(next, [next.focusFamilyId, familyId]), `调整子女顺序 ${getPersonName(next, action.childId)}`)
    }

    case 'swap-partners': {
      const familyId = findAdultFamilyIdForPerson(next, action.personId)
      if (!familyId) {
        return fail('families', '当前人物没有可切换的配偶位置。')
      }

      const family = next.families[familyId]
      if (family.adults.filter(isPersonId).length < 2) {
        return fail(`families.${familyId}.adults`, '当前家庭不足两位成年人，不能切换位置。')
      }

      family.adults = [...family.adults].reverse()
      return ok(next, action.personId, chooseFocusFamily(next, [next.focusFamilyId, familyId]), '切换夫妻位置')
    }

    case 'focus-branch': {
      const family = ensureAdultFamily(next, action.personId)
      if (family.adults[0] !== action.personId) {
        family.adults = [action.personId, ...family.adults.filter((adultId) => adultId !== action.personId)]
      }

      return ok(next, action.personId, family.id, `设为当前宗支 ${getPersonName(next, action.personId)}`)
    }
  }
}
```

- [ ] **Step 4: Run relationship operation tests**

Run:

```powershell
npm.cmd run test -- src/features/editor/publicationOperations.test.ts
```

Expected: PASS, with 4 tests passing.

- [ ] **Step 5: Commit**

```powershell
git add src/features/editor/publicationOperations.ts src/features/editor/publicationOperations.test.ts
git commit -m "feat: centralize publication relationship operations"
```

---

### Task 4: History Extraction

**Files:**

- Create: `src/features/history/historyCore.ts`
- Create: `src/features/history/useEditorHistory.ts`
- Test: `src/features/history/historyCore.test.ts`
- Modify: `src/App.vue:12-224`

- [ ] **Step 1: Write failing history helper tests**

Create `src/features/history/historyCore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../../data/sampleFamily'
import type { EditorSnapshot } from './historyCore'
import { createTrackedSnapshot, inferHistoryLabel } from './historyCore'

function snapshot(selectedPersonId = 'p1', zoom = 0.82): EditorSnapshot {
  return {
    publication: samplePublication,
    settings: {
      ...defaultSettings,
      zoom,
    },
    selectedPersonId,
  }
}

describe('history core', () => {
  it('excludes zoom from tracked snapshots', () => {
    expect(createTrackedSnapshot(snapshot('p1', 0.7))).toEqual(createTrackedSnapshot(snapshot('p1', 1.2)))
  })

  it('uses pending labels before inferred labels', () => {
    expect(inferHistoryLabel(snapshot(), snapshot('p2'), '新增子女')).toBe('新增子女')
  })

  it('labels settings changes separately from publication changes', () => {
    const previous = snapshot()
    const current = {
      ...snapshot(),
      settings: {
        ...defaultSettings,
        cardWidth: defaultSettings.cardWidth + 2,
      },
    }

    expect(inferHistoryLabel(previous, current, '')).toBe('调整版式设置')
  })
})
```

- [ ] **Step 2: Run the failing history tests**

Run:

```powershell
npm.cmd run test -- src/features/history/historyCore.test.ts
```

Expected: FAIL because `historyCore.ts` does not exist.

- [ ] **Step 3: Implement history helpers and composable**

Create `src/features/history/historyCore.ts`:

```ts
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

export function createTrackedSnapshot(snapshot: EditorSnapshot): Omit<EditorSnapshot, 'selectedPersonId'> {
  return {
    publication: snapshot.publication,
    settings: {
      ...snapshot.settings,
      zoom: 0,
    },
  }
}

export function serializeTrackedSnapshot(snapshot: EditorSnapshot): string {
  return JSON.stringify(createTrackedSnapshot(snapshot))
}

export function formatHistoryTime(date = new Date()): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function inferHistoryLabel(
  previousSnapshot: EditorSnapshot,
  currentSnapshot: EditorSnapshot,
  pendingHistoryLabel: string,
): string {
  if (pendingHistoryLabel) {
    return pendingHistoryLabel
  }

  if (JSON.stringify(previousSnapshot.publication) !== JSON.stringify(currentSnapshot.publication)) {
    return '编辑人物关系'
  }

  return '调整版式设置'
}
```

Create `src/features/history/useEditorHistory.ts` by moving the behavior from `src/App.vue:39-224` into this composable:

```ts
import { computed, ref } from 'vue'

import type { EditorSnapshot, HistoryEntry } from './historyCore'
import {
  cloneJson,
  formatHistoryTime,
  inferHistoryLabel,
  serializeTrackedSnapshot,
} from './historyCore'

const MAX_HISTORY_ENTRIES = 80

export function useEditorHistory(input: {
  createSnapshot: () => EditorSnapshot
  restoreSnapshot: (snapshot: EditorSnapshot) => void
}) {
  const historyPast = ref<HistoryEntry[]>([])
  const historyFuture = ref<HistoryEntry[]>([])
  const canUndo = computed(() => historyPast.value.length > 0)
  const canRedo = computed(() => historyFuture.value.length > 0)
  const visibleHistoryEntries = computed(() => [...historyPast.value].reverse().slice(0, 10))

  let historyTimer: number | undefined
  let historyIdSeed = 0
  let isRestoringHistory = false
  let pendingHistoryLabel = ''
  let lastHistorySnapshot: EditorSnapshot | null = null
  let lastTrackedStateSerialized = ''

  function initializeHistoryBaseline() {
    lastHistorySnapshot = input.createSnapshot()
    lastTrackedStateSerialized = serializeTrackedSnapshot(lastHistorySnapshot)
    historyPast.value = []
    historyFuture.value = []
    pendingHistoryLabel = ''
  }

  function commitHistory(label = pendingHistoryLabel) {
    if (isRestoringHistory || !lastHistorySnapshot) {
      return
    }

    const currentSnapshot = input.createSnapshot()
    const currentTrackedStateSerialized = serializeTrackedSnapshot(currentSnapshot)
    if (currentTrackedStateSerialized === lastTrackedStateSerialized) {
      pendingHistoryLabel = ''
      return
    }

    const entry: HistoryEntry = {
      id: `h${Date.now()}-${historyIdSeed++}`,
      label: label || inferHistoryLabel(lastHistorySnapshot, currentSnapshot, pendingHistoryLabel),
      time: formatHistoryTime(),
      snapshot: lastHistorySnapshot,
    }

    historyPast.value = [...historyPast.value, entry].slice(-MAX_HISTORY_ENTRIES)
    historyFuture.value = []
    lastHistorySnapshot = currentSnapshot
    lastTrackedStateSerialized = currentTrackedStateSerialized
    pendingHistoryLabel = ''
  }

  function flushPendingHistory() {
    if (historyTimer !== undefined) {
      window.clearTimeout(historyTimer)
      historyTimer = undefined
    }

    commitHistory()
  }

  function scheduleHistoryCommit() {
    if (isRestoringHistory) {
      return
    }

    if (historyTimer !== undefined) {
      window.clearTimeout(historyTimer)
    }

    historyTimer = window.setTimeout(() => {
      historyTimer = undefined
      commitHistory()
    }, 420)
  }

  function markHistory(label: string) {
    flushPendingHistory()
    pendingHistoryLabel = label
  }

  function restoreHistorySnapshot(snapshot: EditorSnapshot) {
    isRestoringHistory = true
    input.restoreSnapshot(cloneJson(snapshot))
    lastHistorySnapshot = input.createSnapshot()
    lastTrackedStateSerialized = serializeTrackedSnapshot(lastHistorySnapshot)
    window.setTimeout(() => {
      isRestoringHistory = false
    }, 0)
  }

  function undoChange() {
    flushPendingHistory()
    const entry = historyPast.value[historyPast.value.length - 1]
    if (!entry) {
      return
    }

    const currentSnapshot = input.createSnapshot()
    historyPast.value = historyPast.value.slice(0, -1)
    historyFuture.value = [{ ...entry, snapshot: currentSnapshot }, ...historyFuture.value]
    restoreHistorySnapshot(entry.snapshot)
  }

  function redoChange() {
    flushPendingHistory()
    const entry = historyFuture.value[0]
    if (!entry) {
      return
    }

    const currentSnapshot = input.createSnapshot()
    historyFuture.value = historyFuture.value.slice(1)
    historyPast.value = [...historyPast.value, { ...entry, snapshot: currentSnapshot }].slice(-MAX_HISTORY_ENTRIES)
    restoreHistorySnapshot(entry.snapshot)
  }

  function disposeHistory() {
    if (historyTimer !== undefined) {
      window.clearTimeout(historyTimer)
    }
  }

  return {
    historyPast,
    historyFuture,
    canUndo,
    canRedo,
    visibleHistoryEntries,
    initializeHistoryBaseline,
    scheduleHistoryCommit,
    markHistory,
    undoChange,
    redoChange,
    disposeHistory,
  }
}
```

- [ ] **Step 4: Run history tests**

Run:

```powershell
npm.cmd run test -- src/features/history/historyCore.test.ts
```

Expected: PASS, with 3 tests passing.

- [ ] **Step 5: Commit**

```powershell
git add src/features/history/historyCore.ts src/features/history/useEditorHistory.ts src/features/history/historyCore.test.ts
git commit -m "feat: extract editor history state"
```

---

### Task 5: App Integration, JSON Controls, And Error Feedback

**Files:**

- Modify: `src/App.vue:1-1382`
- Modify: `src/style.css`
- Test: all existing `src/**/*.test.ts`

- [ ] **Step 1: Add a build-facing integration check**

No component test library is required for this step. The integration check is the production build, because this task wires Vue template state, refs, imported modules, and TypeScript together.

Run before edits:

```powershell
npm.cmd run build
```

Expected: PASS. This establishes the baseline before refactoring `App.vue`.

- [ ] **Step 2: Replace inline imports and state in `App.vue`**

Modify the top of `src/App.vue` so imports include the new modules:

```ts
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import PublicationCanvas from './components/PublicationCanvas.vue'
import { defaultSettings, samplePublication } from './data/sampleFamily'
import { applyRelationshipAction, summarizeDeleteImpact, type RelationshipAction } from './features/editor/publicationOperations'
import { createDraftPackage, parseDraftJson, parseLocalDraftState, serializeDraftPackage, serializeLocalDraftState } from './features/persistence/draftPersistence'
import { useEditorHistory } from './features/history/useEditorHistory'
import type { EditorSnapshot } from './features/history/historyCore'
import { formatValidationIssues } from './features/validation/draftSchema'
import { layoutPublication } from './lib/layout'
import type { FamilyUnit, Person, PublicationData, PublicationSettings } from './types/family'
```

Remove the inline `EditorSnapshot`, `HistoryEntry`, `MAX_HISTORY_ENTRIES`, and history implementation from `src/App.vue:10-224`. Keep `STORAGE_KEY`, `publication`, `settings`, panel state, `canvasRef`, and selection state. Keep the read-only helpers currently used by computed state: `listFamilies`, `isPersonId`, `findAdultFamilyIdForPerson`, `findParentFamilyIdForPerson`, and `getPersonName`.

Add these state refs after the panel refs:

```ts
const importInputRef = ref<HTMLInputElement | null>(null)
const statusMessage = ref('')
const errorMessage = ref('')
```

- [ ] **Step 3: Add snapshot, replace, history, and draft helpers**

Add these functions in `src/App.vue` after state declarations:

```ts
function createEditorSnapshot(): EditorSnapshot {
  return {
    publication: JSON.parse(JSON.stringify(publication)) as PublicationData,
    settings: JSON.parse(JSON.stringify(settings)) as PublicationSettings,
    selectedPersonId: selectedPersonId.value,
  }
}

function replaceReactiveObject<T extends object>(target: T, source: T) {
  Object.keys(target).forEach((key) => {
    delete (target as Record<string, unknown>)[key]
  })

  Object.assign(target, source)
}

function restoreEditorSnapshot(snapshot: EditorSnapshot) {
  const currentZoom = settings.zoom
  replaceReactiveObject(publication, snapshot.publication)
  replaceReactiveObject(settings, snapshot.settings)
  settings.zoom = currentZoom
  selectedPersonId.value =
    publication.people[snapshot.selectedPersonId] ? snapshot.selectedPersonId : Object.keys(publication.people)[0] ?? ''

  if (!publication.families[publication.focusFamilyId]) {
    publication.focusFamilyId = Object.keys(publication.families)[0] ?? ''
  }

  if (!selectedPersonId.value) {
    editorOpen.value = false
  }
}

const {
  historyPast,
  historyFuture,
  canUndo,
  canRedo,
  visibleHistoryEntries,
  initializeHistoryBaseline,
  scheduleHistoryCommit,
  markHistory,
  undoChange,
  redoChange,
  disposeHistory,
} = useEditorHistory({
  createSnapshot: createEditorSnapshot,
  restoreSnapshot: restoreEditorSnapshot,
})
```

Replace the old `applyDraft` implementation with:

```ts
function applyDraft(raw: string | null) {
  if (!raw) {
    return
  }

  const parsed = parseLocalDraftState(raw)
  if (!parsed.ok) {
    localStorage.removeItem(STORAGE_KEY)
    errorMessage.value = formatValidationIssues(parsed.issues)
    return
  }

  replaceReactiveObject(publication, parsed.value.publication)
  replaceReactiveObject(settings, parsed.value.settings)
  selectedPersonId.value = parsed.value.selectedPersonId ?? Object.keys(publication.people)[0] ?? ''
}
```

Replace the persistence watcher body with:

```ts
localStorage.setItem(STORAGE_KEY, serializeLocalDraftState(publication, settings, selectedPersonId.value))
```

Replace `onBeforeUnmount` history cleanup with:

```ts
disposeHistory()
window.removeEventListener('keydown', handleHistoryShortcut)
```

- [ ] **Step 4: Route relationship buttons through the operation layer**

Add this helper in `src/App.vue` near the existing relationship handlers:

```ts
function applyEditorAction(action: RelationshipAction, confirmation?: string) {
  if (confirmation && !window.confirm(confirmation)) {
    return
  }

  const result = applyRelationshipAction(publication, action)
  if (!result.ok) {
    errorMessage.value = formatValidationIssues(result.issues)
    return
  }

  errorMessage.value = ''
  markHistory(result.value.historyLabel)
  replaceReactiveObject(publication, result.value.publication)
  publication.focusFamilyId = result.value.focusFamilyId
  selectedPersonId.value = result.value.selectedPersonId
  editorOpen.value = Boolean(selectedPersonId.value)
  canvasRef.value?.resetView?.()
}
```

Replace relationship handlers in `src/App.vue:672-889` with these wrappers:

```ts
function addSpouse() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'add-spouse', personId: selectedPerson.value.id })
  }
}

function addChild() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'add-child', personId: selectedPerson.value.id })
  }
}

function addParents() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'add-parents', personId: selectedPerson.value.id })
  }
}

function focusSelectedBranch() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'focus-branch', personId: selectedPerson.value.id })
  }
}

function swapPartnerOrder() {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'swap-partners', personId: selectedPerson.value.id })
  }
}

function moveChild(childId: string, direction: -1 | 1) {
  if (selectedPerson.value) {
    applyEditorAction({ type: 'move-child', parentPersonId: selectedPerson.value.id, childId, direction })
  }
}

function removeSpouseRelation() {
  const person = selectedPerson.value
  const spouse = selectedSpouse.value
  if (!person || !spouse) {
    return
  }

  applyEditorAction(
    { type: 'remove-spouse', personId: person.id },
    `将解除 ${person.name} 与 ${spouse.name} 的配偶关系，是否继续？`,
  )
}

function removeParentsRelation() {
  const person = selectedPerson.value
  if (!person || !selectedParents.value.length) {
    return
  }

  applyEditorAction(
    { type: 'remove-parents', personId: person.id },
    `将解除 ${person.name} 与 ${selectedParents.value.map((parent) => parent.name).join('、')} 的父母关系，是否继续？`,
  )
}

function deleteSelectedPerson() {
  const person = selectedPerson.value
  if (!person) {
    return
  }

  const impact = summarizeDeleteImpact(publication, person.id)
  const summary = impact
    ? [
        impact.spouseNames.length ? `配偶：${impact.spouseNames.join('、')}` : '',
        impact.parentNames.length ? `父母：${impact.parentNames.join('、')}` : '',
        impact.childNames.length ? `子女：${impact.childNames.join('、')}` : '',
        impact.removedFamilyIds.length ? `清理家庭：${impact.removedFamilyIds.join('、')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  applyEditorAction(
    { type: 'delete-person', personId: person.id },
    `将删除人物“${person.name}”。${summary ? `\n${summary}\n` : '\n'}是否继续？`,
  )
}
```

After these wrappers are in place, remove the mutation helpers that are no longer used in `App.vue`: `getNextEntityId`, `createPerson`, `ensureAdultFamily`, `normalizeFamilyMembers`, `ensureVisibleFamilyForPerson`, `pruneFamilies`, and `syncSelectionAndFocus`. Those responsibilities now live in `src/features/editor/publicationOperations.ts`.

- [ ] **Step 5: Add JSON import and export handlers**

Add these helpers near `downloadSvg` and `printPublication`:

```ts
function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function exportJson() {
  const draft = createDraftPackage(publication, settings)
  downloadTextFile(`${sanitizeFileName(publication.title)}.json`, serializeDraftPackage(draft), 'application/json;charset=utf-8')
  statusMessage.value = '已导出 JSON 草稿。'
  errorMessage.value = ''
}

function openJsonImport() {
  importInputRef.value?.click()
}

async function handleJsonImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  if (!window.confirm('导入 JSON 会覆盖当前草稿，是否继续？')) {
    return
  }

  const parsed = parseDraftJson(await file.text())
  if (!parsed.ok) {
    errorMessage.value = formatValidationIssues(parsed.issues)
    statusMessage.value = ''
    return
  }

  markHistory('导入 JSON 草稿')
  replaceReactiveObject(publication, parsed.value.publication)
  replaceReactiveObject(settings, parsed.value.settings)
  selectedPersonId.value = Object.keys(publication.people)[0] ?? ''
  errorMessage.value = ''
  statusMessage.value = '已导入 JSON 草稿。'
  initializeHistoryBaseline()
  canvasRef.value?.resetView?.()
}
```

Update `downloadSvg` and `printPublication` so they set `errorMessage.value = '当前画布还没有可导出的 SVG。'` when `serializeSvg()` returns `null`.

- [ ] **Step 6: Update template controls and status panels**

Modify `src/App.vue:1065-1069` topbar actions to include JSON controls:

```vue
<div class="topbar__actions">
  <input ref="importInputRef" class="visually-hidden" type="file" accept="application/json,.json" @change="handleJsonImport" />
  <button class="btn btn--secondary" type="button" @click="openJsonImport">导入 JSON</button>
  <button class="btn btn--secondary" type="button" @click="exportJson">导出 JSON</button>
  <button class="btn btn--secondary" type="button" @click="restoreSample">恢复示例</button>
  <button class="btn btn--secondary" type="button" @click="downloadSvg">导出 SVG</button>
  <button class="btn btn--primary" type="button" @click="printPublication">打印排版</button>
</div>
```

Add this block immediately after the `header` element:

```vue
<div v-if="errorMessage || statusMessage" class="feedback-strip" :class="{ 'feedback-strip--error': errorMessage }">
  <strong>{{ errorMessage ? '需要处理' : '操作完成' }}</strong>
  <span>{{ errorMessage || statusMessage }}</span>
  <button type="button" @click="errorMessage = ''; statusMessage = ''">关闭</button>
</div>
```

Add these styles to `src/style.css`:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.feedback-strip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  margin: 0 24px 18px;
  padding: 14px 18px;
  border: 1px solid rgba(85, 107, 47, 0.22);
  border-radius: 18px;
  background: rgba(239, 231, 205, 0.86);
  color: #2f3428;
}

.feedback-strip--error {
  border-color: rgba(148, 56, 43, 0.32);
  background: rgba(250, 223, 215, 0.9);
  color: #612b24;
}

.feedback-strip button {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(47, 52, 40, 0.1);
  color: inherit;
  cursor: pointer;
}
```

- [ ] **Step 7: Run full verification**

Run:

```powershell
npm.cmd run test
npm.cmd run build
```

Expected: tests PASS and production build PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/App.vue src/style.css
git commit -m "feat: integrate draft import export workflow"
```

---

### Task 6: Final Manual QA And Scope Guard

**Files:**

- Modify: `docs/superpowers/specs/2026-04-17-local-genealogy-workbench-design.md`
- Modify: `docs/superpowers/plans/2026-04-17-local-genealogy-workbench.md`

- [ ] **Step 1: Run automated checks**

Run:

```powershell
npm.cmd run test
npm.cmd run build
```

Expected: both commands PASS.

- [ ] **Step 2: Run manual browser QA**

Run:

```powershell
npm.cmd run dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

In the browser, verify these actions:

- Import a valid JSON file exported by the app, confirm it replaces the current draft, and verify the canvas redraws.
- Import malformed JSON, confirm the feedback strip shows a specific parsing error and the current draft stays unchanged.
- Add spouse, add child, add parents, move child order, undo, redo, and refresh the page to confirm local draft recovery.
- Delete a person with spouse or children and verify the confirmation text lists affected relations.
- Export SVG and print after edits, confirm both still open/export from the current layout.

- [ ] **Step 3: Check the scope guard**

Open `docs/superpowers/specs/2026-04-17-local-genealogy-workbench-design.md` and confirm the implementation still respects the exclusions:

```text
登录与权限体系
后端接口
数据库建模与持久化服务
多人协作
审批流
复杂运营后台
外部系统集成
```

If any of those appeared in code, remove that scope from the implementation before final commit.

- [ ] **Step 4: Commit final docs if they changed**

```powershell
git add docs/superpowers/specs/2026-04-17-local-genealogy-workbench-design.md docs/superpowers/plans/2026-04-17-local-genealogy-workbench.md
git commit -m "docs: finalize local workbench implementation plan"
```

If the docs did not change in this task, skip the commit and record that no documentation delta was needed.

---

## Implementation Order

1. Task 1 establishes test tooling and validation vocabulary.
2. Task 2 makes JSON import/export data safe and versioned.
3. Task 3 centralizes relationship mutations before UI integration.
4. Task 4 extracts history behavior while preserving existing undo/redo semantics.
5. Task 5 connects the UI to the extracted modules and adds visible JSON workflow controls.
6. Task 6 verifies the final behavior and protects the agreed single-machine scope.

## Completion Criteria

- `npm.cmd run test` passes.
- `npm.cmd run build` passes.
- JSON exported from the app can be imported back into the app.
- Invalid JSON does not mutate the current draft.
- Relationship operations are performed through `applyRelationshipAction`.
- `src/App.vue` no longer owns validation, persistence parsing, relationship graph mutation, or full history management.
- SVG export and print remain functional after the refactor.
