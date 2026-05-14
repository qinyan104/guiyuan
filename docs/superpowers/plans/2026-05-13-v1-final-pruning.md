# V1 Final Pruning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unfinished PDF and person-detail features from the 1.0 surface area, repair exported share HTML files so they open correctly, and sync the docs to match the final release scope.

**Architecture:** Keep backend PDF code in place for now, but remove all user-facing frontend entry points. Repair the share export at the template/helper level with focused unit tests. Replace all person-detail navigation with “return to workbench and focus this person” behavior so the product stays coherent without a standalone detail page.

**Tech Stack:** Vue 3, Vue Router 4, TypeScript, Vitest, Vite, existing frontend export helpers, Markdown docs

---

### Task 1: Prune PDF Export UI And Dead Frontend Handlers

**Files:**
- Create: `frontend/src/features/export/ExportDialog.test.ts`
- Modify: `frontend/src/features/export/ExportDialog.vue`
- Modify: `frontend/src/components/WorkbenchHeader.vue`
- Modify: `frontend/src/views/WorkbenchView.vue`

- [ ] **Step 1: Write the failing export-dialog test**

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExportDialog from './ExportDialog.vue'

describe('ExportDialog', () => {
  it('only exposes svg and share export options for v1 final', () => {
    const wrapper = mount(ExportDialog, {
      props: {
        modelValue: true,
        isProcessing: false,
      },
    })

    expect(wrapper.text()).not.toContain('单页矢量 PDF')
    expect(wrapper.text()).not.toContain('谱书 PDF')
    expect(wrapper.text()).toContain('矢量 SVG')
    expect(wrapper.text()).toContain('分享网页')
  })
})
```

- [ ] **Step 2: Run the new test to confirm current behavior fails**

Run: `npm run test -- src/features/export/ExportDialog.test.ts`

Expected: FAIL because the dialog still renders `单页矢量 PDF` and `谱书 PDF`.

- [ ] **Step 3: Remove the PDF tabs from `ExportDialog.vue` and simplify its state**

Replace the tab union and button set with the trimmed version below:

```ts
const emit = defineEmits(['update:modelValue', 'export-svg', 'export-share-html'])

const activeTab = ref<'svg' | 'share'>('svg')
```

```vue
<div class="tabs">
  <button
    @click="activeTab = 'svg'"
    :class="['tab-btn', { active: activeTab === 'svg' }]"
  >
    矢量 SVG
  </button>
  <button
    @click="activeTab = 'share'"
    :class="['tab-btn', { active: activeTab === 'share' }]"
  >
    分享网页
  </button>
</div>

<div v-if="activeTab === 'svg'" class="tab-content">
  <p class="description">导出为无限放大的矢量文件。这是 1.0 最稳定的长卷导出格式。</p>
  <div class="actions">
    <button class="btn btn--primary" @click="$emit('export-svg')" :disabled="isProcessing">
      立即下载矢量 SVG
    </button>
  </div>
</div>
```

- [ ] **Step 4: Remove the unreachable PDF imports and handlers from `WorkbenchHeader.vue`**

Delete the PDF-only imports:

```ts
import { buildSinglePagePdfRequest, captureCanvasAsBase64, captureCanvasAsSvgMarkup } from '../features/export/useCanvasExport'
import { useExportState } from '../features/export/useExportState'
```

Delete the handlers:

```ts
async function handleExportPdfSingle() {}
async function handlePreviewPdf(options: any) {}
```

Trim the emit contract, dialog wiring, and menu copy to only keep share + SVG:

```ts
const emit = defineEmits<{
  (event: 'import-json', payload: Event): void
  (event: 'open-file'): void
  (event: 'create-blank'): void
  (event: 'save-file'): void
  (event: 'save-file-as'): void
  (event: 'download-svg'): void
  (event: 'export-json'): void
  (event: 'export-share-html', password: string): void
  (event: 'change-theme', themeId: ThemeId): void
  (event: 'logout'): void
  (event: 'go-back'): void
  (event: 'view-stats'): void
  (event: 'view-timeline'): void
}>()
```

```vue
<button class="dropdown-item" type="button" @click="showExportDialog = true">导出与分享</button>
```

```vue
<ExportDialog
  v-model="showExportDialog"
  :is-processing="isExporting"
  @export-svg="emit('download-svg'); showExportDialog = false"
  @export-share-html="handleExportShareHtml"
/>
```

- [ ] **Step 5: Remove the dead `@print-publication` binding from `WorkbenchView.vue`**

Delete this binding from the header usage:

```vue
@print-publication="fileOps.printPublication"
```

Do not delete `printPublication()` from `useFileOperations.ts` in this task. It is not user-visible anymore, and keeping that helper out of scope avoids unnecessary churn in the final release pass.

- [ ] **Step 6: Re-run the focused test**

Run: `npm run test -- src/features/export/ExportDialog.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the UI pruning**

```bash
git add frontend/src/features/export/ExportDialog.test.ts frontend/src/features/export/ExportDialog.vue frontend/src/components/WorkbenchHeader.vue frontend/src/views/WorkbenchView.vue
git commit -m "refactor: prune pdf export ui for v1 final"
```

### Task 2: Lock Down Share HTML Template Output With Tests

**Files:**
- Create: `frontend/src/features/export/shareHtmlExport.test.ts`
- Modify: `frontend/src/features/export/shareHtmlExport.ts`

- [ ] **Step 1: Write failing tests for the broken share-export text and script**

```ts
import { describe, expect, it } from 'vitest'

import { buildEmbeddedScript, buildHtmlTemplate, buildInfoHeader } from './shareHtmlExport'

describe('shareHtmlExport helpers', () => {
  it('renders readable publication metadata in the info header', () => {
    const html = buildInfoHeader({
      title: '归源',
      subtitle: '李氏宗谱',
      people: {},
      families: {},
      info: {
        ancestralOrigin: '陇西',
        hallName: '敦本堂',
        familyMotto: '敦亲睦族',
      },
    } as any)

    expect(html).toContain('郡望/祖籍：陇西')
    expect(html).toContain('堂号：敦本堂')
    expect(html).toContain('族训：敦亲睦族')
  })

  it('renders readable password-gate copy in the final html document', () => {
    const html = buildHtmlTemplate({
      title: '归源',
      themeCss: ':root {}',
      infoHeader: '<h1>归源</h1>',
      statsHtml: '共 1 人',
      script: 'console.log("ok")',
      isEncrypted: true,
      generatedAt: '2026/05/13 23:00:00',
    })

    expect(html).toContain('族谱已加密')
    expect(html).toContain('请输入密码以查看内容')
    expect(html).toContain('生成于：2026/05/13 23:00:00')
  })

  it('emits a syntactically valid unlock script with readable error copy', () => {
    const script = buildEmbeddedScript('{"v":1,"salt":"a","iv":"b","data":"c"}', true)

    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain('请输入密码')
    expect(script).toContain('密码错误或文件已损坏')
  })
})
```

- [ ] **Step 2: Run the share-export helper tests to verify they fail**

Run: `npm run test -- src/features/export/shareHtmlExport.test.ts`

Expected: FAIL because the current helper output contains broken text and at least one malformed script string.

- [ ] **Step 3: Export the helper functions and repair the corrupted strings in `shareHtmlExport.ts`**

Expose the helpers so the tests can import them by changing the declarations in place:

```ts
function buildInfoHeader(pub: PublicationData): string {
```

becomes

```ts
export function buildInfoHeader(pub: PublicationData): string {
```

```ts
function buildEmbeddedScript(dataJson: string, isEncrypted: boolean): string {
```

becomes

```ts
export function buildEmbeddedScript(dataJson: string, isEncrypted: boolean): string {
```

```ts
function buildHtmlTemplate(options: {
  title: string
  themeCss: string
  infoHeader: string
  statsHtml: string
  script: string
  isEncrypted: boolean
  generatedAt: string
}): string {
```

becomes

```ts
export function buildHtmlTemplate(options: {
  title: string
  themeCss: string
  infoHeader: string
  statsHtml: string
  script: string
  isEncrypted: boolean
  generatedAt: string
}): string {
```

Keep their existing bodies, then apply the string and interpolation repairs below in the same edit.
```

Repair the known broken copy and interpolation points:

```ts
if (pub.info?.ancestralOrigin) {
  infoItems.push(`<span class="info-tag">郡望/祖籍：${escapeHtml(pub.info.ancestralOrigin)}</span>`)
}
if (pub.info?.hallName) {
  infoItems.push(`<span class="info-tag">堂号：${escapeHtml(pub.info.hallName)}</span>`)
}
if (pub.info?.familyMotto) {
  infoItems.push(`<span class="info-tag">族训：${escapeHtml(pub.info.familyMotto)}</span>`)
}
```

```ts
const parts: string[] = [`<span>共 ${total} 人</span>`]
if (alive > 0) parts.push(`<span>在世 ${alive} 人</span>`)
if (deceased > 0) parts.push(`<span>已故 ${deceased} 人</span>`)
```

```ts
html += '<span class="detail-gender">' + (person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知') + '</span>'
if (person.titleName) details.push({ label: '称号', value: person.titleName })
```

```ts
if (!pwd) { errEl.textContent = '请输入密码'; return; }
errEl.textContent = '解密中...'
```

```html
<h2>族谱已加密</h2>
<p>请输入密码以查看内容</p>
```

```html
<span>生成于：${escapeHtml(options.generatedAt)} · 仅供内部传阅</span>
```

- [ ] **Step 4: Re-run the helper tests**

Run: `npm run test -- src/features/export/shareHtmlExport.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the share-template lock-down**

```bash
git add frontend/src/features/export/shareHtmlExport.test.ts frontend/src/features/export/shareHtmlExport.ts
git commit -m "fix: repair exported share html template text and script"
```

### Task 3: Verify Full Share HTML Generation Still Produces A Viewable Document

**Files:**
- Modify: `frontend/src/features/export/shareHtmlExport.test.ts`
- Modify: `frontend/src/features/export/shareHtmlExport.ts`

- [ ] **Step 1: Add an integration-style test around `generateShareHtml()`**

Append this case to `frontend/src/features/export/shareHtmlExport.test.ts`:

```ts
import { vi } from 'vitest'
import { generateShareHtml } from './shareHtmlExport'

vi.mock('../persistence/draftPersistence', () => ({
  createPortablePublication: vi.fn(async (publication) => publication),
}))

vi.mock('./publicationExport', () => ({
  createStandalonePublicationSvg: vi.fn(async ({ svgElement }) => svgElement),
  escapeHtml: (value: string) => value,
  getSvgThemeMap: () => ({ '--bg-paper': '#fffdf8' }),
  serializeSvg: () => '<svg viewBox="0 0 100 100"><g class="person-card" data-person-id="p1"></g></svg>',
}))

it('builds a standalone share html document with the expected shell', async () => {
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgElement.setAttribute('viewBox', '0 0 100 100')

  const html = await generateShareHtml({
    publication: {
      title: '归源',
      subtitle: '李氏宗谱',
      people: {
        p1: { id: 'p1', name: '李青', gender: 'male', birth: '', death: '', age: '', clan: '', titleName: '', note: '', deceased: false, avatarUrl: '' },
      },
      families: {},
    } as any,
    settings: {} as any,
    layout: { cards: [{ id: 'p1' }], width: 100, height: 100 } as any,
    svgElement,
  })

  expect(html).toContain('id="app"')
  expect(html).toContain('id="tree-viewport"')
  expect(html).toContain('id="detail-panel"')
  expect(html).toContain('李氏宗谱')
  expect(html).toContain('setupCardClick')
})
```

- [ ] **Step 2: Run the test and confirm it fails only if the shell is still malformed**

Run: `npm run test -- src/features/export/shareHtmlExport.test.ts`

Expected: PASS for the helper fixes from Task 2, and FAIL only if the real `generateShareHtml()` output is still missing required structure.

- [ ] **Step 3: Patch any remaining shell issues in `generateShareHtml()` or its template call-site**

If the integration-style test still fails, align the final HTML assembly with this shape:

```ts
const html = buildHtmlTemplate({
  title: publication.title.trim() || 'Guiyuan Share',
  themeCss,
  infoHeader,
  statsHtml,
  script,
  isEncrypted,
  generatedAt,
})
```

Keep the final shell intact:

```html
<div id="app">
  <header id="pub-header">...</header>
  <main id="tree-viewport">
    <div id="tree-camera"></div>
  </main>
  <aside id="detail-panel">
    <button id="detail-close">&times;</button>
    <div id="detail-content"></div>
  </aside>
  <footer id="pub-footer">...</footer>
</div>
```

- [ ] **Step 4: Re-run the share export test file**

Run: `npm run test -- src/features/export/shareHtmlExport.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the end-to-end share export repair**

```bash
git add frontend/src/features/export/shareHtmlExport.test.ts frontend/src/features/export/shareHtmlExport.ts
git commit -m "test: cover standalone share html generation"
```

### Task 4: Remove Person-Detail Surface Area And Re-route Person Navigation

**Files:**
- Create: `frontend/src/composables/useWorkbenchRouteFocus.ts`
- Create: `frontend/src/composables/useWorkbenchRouteFocus.test.ts`
- Create: `frontend/src/components/PersonEditorDrawer.test.ts`
- Create: `frontend/src/components/GlobalSearch.test.ts`
- Create: `frontend/src/views/TimelineView.test.ts`
- Modify: `frontend/src/components/PersonEditorDrawer.vue`
- Modify: `frontend/src/views/WorkbenchView.vue`
- Modify: `frontend/src/components/GlobalSearch.vue`
- Modify: `frontend/src/views/TimelineView.vue`
- Modify: `frontend/src/router/index.ts`
- Delete: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Write the failing test that proves the editor drawer no longer exposes the removed detail button**

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PersonEditorDrawer from './PersonEditorDrawer.vue'

describe('PersonEditorDrawer', () => {
  it('does not expose the removed person-detail entrypoint', () => {
    const wrapper = mount(PersonEditorDrawer, {
      props: {
        open: true,
        person: { id: 'p1', name: '李青', gender: 'male', birth: '', death: '', age: '', titleName: '', clan: '', note: '', avatarUrl: '', deceased: false },
        publicationId: 1,
        suggestion: '',
        lineageSuggestion: '',
        details: [],
        spouse: null,
        parents: [],
        children: [],
        childItems: [],
        canAddSpouse: false,
        hasCompleteParents: false,
        canSwapAdults: false,
        isSelectedBranchFocused: false,
        canSetBranchMode: false,
        branchMode: '',
        parentActionLabel: '补录父母',
        branchActionLabel: '查看宗支',
      },
      global: {
        stubs: {
          BranchMountManager: true,
          Transition: false,
        },
      },
    })

    expect(wrapper.text()).not.toContain('披阅本纪')
  })
})
```

- [ ] **Step 2: Write the failing tests that prove person navigation now returns to workbench**

`frontend/src/composables/useWorkbenchRouteFocus.test.ts`

```ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { applyWorkbenchRouteFocus } from './useWorkbenchRouteFocus'

describe('applyWorkbenchRouteFocus', () => {
  it('selects, opens, reveals, and clears the personId query', async () => {
    const router = { replace: vi.fn() }
    const selectedPersonId = ref('')
    const editorOpen = ref(false)
    const revealPerson = vi.fn()

    await applyWorkbenchRouteFocus({
      routeQuery: { personId: 'p2' },
      router: router as any,
      publicationId: 7,
      publication: {
        people: {
          p2: { id: 'p2', name: '李青' },
        },
      } as any,
      selectedPersonId,
      editorOpen,
      revealPersonInCanvas: revealPerson,
    })

    expect(selectedPersonId.value).toBe('p2')
    expect(editorOpen.value).toBe(true)
    expect(revealPerson).toHaveBeenCalledWith('p2')
    expect(router.replace).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: 7 },
      query: {},
    })
  })
})
```

`frontend/src/components/GlobalSearch.test.ts`

```ts
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GlobalSearch from './GlobalSearch.vue'
import { searchApi } from '../api/search'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('../api/search', () => ({
  searchApi: vi.fn(),
}))

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    push.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('routes person hits back to workbench with a personId query', async () => {
    vi.mocked(searchApi).mockResolvedValue({
      publications: [],
      persons: [
        { personId: 'p9', name: '李青', publicationId: 42, publicationTitle: '李氏宗谱' },
      ],
    } as any)

    const wrapper = mount(GlobalSearch)
    await wrapper.get('input').setValue('李青')
    await vi.advanceTimersByTimeAsync(300)
    await Promise.resolve()
    await Promise.resolve()

    await wrapper.get('.result-item').trigger('mousedown')

    expect(push).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: 42 },
      query: { personId: 'p9' },
    })
  })
})
```

`frontend/src/views/TimelineView.test.ts`

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import TimelineView from './TimelineView.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

describe('TimelineView', () => {
  it('routes event clicks back to workbench with a personId query', async () => {
    const wrapper = mount(TimelineView, {
      props: { publicationId: 8 },
      global: {
        provide: {
          'publication-context': {
            pub: {
              publication: {
                people: {
                  p1: {
                    id: 'p1',
                    name: '李青',
                    gender: 'male',
                    birth: '1901年',
                    death: '',
                    age: '',
                    titleName: '',
                    clan: '',
                    note: '',
                    avatarUrl: '',
                    deceased: false,
                  },
                },
              },
            },
          },
        },
      },
    })

    await wrapper.get('.event-wrapper').trigger('click')

    expect(push).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: 8 },
      query: { personId: 'p1' },
    })
  })
})
```

- [ ] **Step 3: Run the four new navigation-focused tests and confirm they fail on the old routes**

Run: `npm run test -- src/components/PersonEditorDrawer.test.ts src/composables/useWorkbenchRouteFocus.test.ts src/components/GlobalSearch.test.ts src/views/TimelineView.test.ts`

Expected: FAIL because the detail button still exists, `person-detail` is still referenced, and the workbench query focus helper does not exist yet.

- [ ] **Step 4: Implement the workbench focus helper and wire the route query into the editor workflow**

Create `frontend/src/composables/useWorkbenchRouteFocus.ts`:

```ts
import type { Ref } from 'vue'

interface ApplyWorkbenchRouteFocusOptions {
  routeQuery: Record<string, unknown>
  router: { replace: (location: { name: string; params: { id: number }; query: Record<string, unknown> }) => unknown }
  publicationId: number
  publication: { people: Record<string, unknown> }
  selectedPersonId: Ref<string>
  editorOpen: Ref<boolean>
  revealPersonInCanvas: (personId: string) => void
}

export async function applyWorkbenchRouteFocus(options: ApplyWorkbenchRouteFocusOptions) {
  const personId = typeof options.routeQuery.personId === 'string' ? options.routeQuery.personId : ''
  if (!personId || !options.publication.people[personId]) return

  options.selectedPersonId.value = personId
  options.editorOpen.value = true
  options.revealPersonInCanvas(personId)

  const nextQuery = { ...options.routeQuery }
  delete nextQuery.personId

  await options.router.replace({
    name: 'workbench',
    params: { id: options.publicationId },
    query: nextQuery,
  })
}
```

Use it from `frontend/src/views/WorkbenchView.vue`:

```ts
import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyWorkbenchRouteFocus } from '../composables/useWorkbenchRouteFocus'

const route = useRoute()
```

```ts
watch(
  () => [route.query.personId, Object.keys(context.pub.publication.people).length],
  async () => {
    await nextTick()
    await applyWorkbenchRouteFocus({
      routeQuery: route.query as Record<string, unknown>,
      router,
      publicationId: props.publicationId,
      publication: context.pub.publication,
      selectedPersonId: context.pub.selectedPersonId,
      editorOpen: panels.editorOpen,
      revealPersonInCanvas,
    })
  },
  { immediate: true, flush: 'post' },
)
```

- [ ] **Step 5: Remove the detail page surface and repoint all person navigation**

Trim `frontend/src/components/PersonEditorDrawer.vue`:

```ts
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select-person', personId: string): void
  (event: 'add-spouse'): void
  (event: 'add-child', gender: Gender): void
  (event: 'add-parents'): void
  (event: 'remove-spouse'): void
  (event: 'remove-parents'): void
  (event: 'focus-branch'): void
  (event: 'update-branch-mode', branchMode: FamilyBranchMode): void
  (event: 'swap-partners'): void
  (event: 'move-child', payload: { childId: string; direction: -1 | 1 }): void
  (event: 'update-person-field', payload: { field: EditablePersonField; value: string }): void
  (event: 'update-person-gender', gender: Gender): void
  (event: 'apply-note-suggestion', value: string): void
  (event: 'delete-person'): void
}>()
```

Delete the entire detail-link section:

```vue
<section class="detail-link-zone">
  <button class="relation-btn relation-btn--secondary" type="button" @click="$emit('view-detail')">
    披阅本纪 (详情)
  </button>
</section>
```

Remove the old binding from `WorkbenchView.vue`:

```vue
@view-detail="router.push({ name: 'person-detail', params: { personId: context.pub.selectedPersonId.value } })"
```

Repoint search and timeline:

```ts
function navigateToPerson(hit: PersonHit) {
  isOpen.value = false
  router.push({
    name: 'workbench',
    params: { id: hit.publicationId },
    query: { personId: hit.personId },
  })
}
```

```ts
function goToPerson(personId: string) {
  router.push({
    name: 'workbench',
    params: { id: props.publicationId },
    query: { personId },
  })
}
```

Remove the `person-detail` child route from `frontend/src/router/index.ts`:

```ts
{
  path: '',
  name: 'workbench',
  component: () => import('../views/WorkbenchView.vue'),
  props: (route) => ({ publicationId: Number(route.params.id) }),
},
{
  path: 'stats',
  name: 'publication-stats',
  component: () => import('../views/PublicationStatsView.vue'),
  props: (route) => ({ publicationId: Number(route.params.id) }),
},
```

Delete `frontend/src/views/PersonDetailView.vue`.

- [ ] **Step 6: Re-run the navigation-focused tests**

Run: `npm run test -- src/components/PersonEditorDrawer.test.ts src/composables/useWorkbenchRouteFocus.test.ts src/components/GlobalSearch.test.ts src/views/TimelineView.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the person-detail removal**

```bash
git add frontend/src/composables/useWorkbenchRouteFocus.ts frontend/src/composables/useWorkbenchRouteFocus.test.ts frontend/src/components/PersonEditorDrawer.test.ts frontend/src/components/GlobalSearch.test.ts frontend/src/views/TimelineView.test.ts frontend/src/components/PersonEditorDrawer.vue frontend/src/views/WorkbenchView.vue frontend/src/components/GlobalSearch.vue frontend/src/views/TimelineView.vue frontend/src/router/index.ts
git rm frontend/src/views/PersonDetailView.vue
git commit -m "refactor: remove person detail page for v1 final"
```

### Task 5: Sync Release Docs And Run Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/OPERATIONS_GUIDE.md`

- [ ] **Step 1: Update `README.md` so the retained export surface matches the product**

Replace the export checklist with 1.0-final wording:

```md
7. 尝试导出 JSON、SVG 或分享网页
```

Add a short scope note near the release guidance:

```md
## 1.0 最终版说明

当前 `1.0` 正式版保留以下稳定导出能力：

- `JSON`
- `SVG`
- `分享网页`

`单页矢量 PDF`、`谱书 PDF` 与独立人物详情页已从正式版入口中下线，后续若继续开发再单独恢复。
```

- [ ] **Step 2: Update `docs/OPERATIONS_GUIDE.md` to remove PDF from the supported operator surface**

Replace the export/API summary with the share-only wording:

```md
### 导出与分享
- `GET /api/shares/{token}`: 访问公开分享的族谱
```

Add a release note in the troubleshooting/export area:

```md
### 1.0 正式版范围
- 前端正式入口保留 `JSON`、`SVG`、`分享网页` 三类导出。
- `单页矢量 PDF` 与 `谱书 PDF` 未纳入 `1.0` 正式版入口。
- 人物详情页已下线，人物查看与编辑统一回到无涯画布上下文。
```

- [ ] **Step 3: Run all focused verification for this plan**

Run:

```bash
npm run test -- src/features/export/ExportDialog.test.ts src/features/export/shareHtmlExport.test.ts src/components/PersonEditorDrawer.test.ts src/composables/useWorkbenchRouteFocus.test.ts src/components/GlobalSearch.test.ts src/views/TimelineView.test.ts
npm run build
```

Expected:

- `vitest` reports PASS for all six focused test files.
- `vite build` completes successfully.

- [ ] **Step 4: Manual smoke-check the share HTML from the running app**

Open the workbench and verify this exact flow:

1. 打开任意已有族谱。
2. 进入 `导出与发布`。
3. 确认看不到 `单页矢量 PDF` 和 `谱书 PDF`。
4. 生成一个未加密的分享网页并本地打开。
5. 确认页面能看到长卷内容，点击人物卡会打开右侧/底部详情面板。
6. 再生成一个带密码的分享网页并本地打开。
7. 确认输入密码后能正常解锁内容。
8. 在人物编辑抽屉中确认不再出现 `披阅本纪（详情）`。
9. 在全局搜索和时间线中点击人物，确认会回到工作台并定位该人物。

- [ ] **Step 5: Commit the docs and verification pass**

```bash
git add README.md docs/OPERATIONS_GUIDE.md
git commit -m "docs: align v1 final release scope"
```
