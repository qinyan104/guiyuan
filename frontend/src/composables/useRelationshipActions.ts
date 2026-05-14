import { nextTick, type Ref } from 'vue'

import type { FamilyBranchMode, Gender } from '../types/family'
import { applyRelationshipAction, summarizeDeleteImpact, type RelationshipAction } from '../features/editor/publicationOperations'
import { formatValidationIssues } from '../features/validation/draftSchema'
import { blankPublication, defaultSettings } from '../data/sampleFamily'

import type { PublicationStateReturn } from './usePublicationState'

interface RelationshipActionsDeps {
  pub: PublicationStateReturn
  statusMessage: Ref<string>
  errorMessage: Ref<string>
  editorOpen: Ref<boolean>
  layoutPanelOpen: Ref<boolean>
  historyOpen: Ref<boolean>
  markHistory: (label: string) => void
  initializeHistoryBaseline: () => void
  canvasRef: Ref<{ resetView?: () => void; revealPerson?: (personId: string, options?: object) => void } | null>
  revealPersonInCanvas: (personId: string) => void
  shouldReplaceCurrentDraft: () => boolean
  draftFileHandle: Ref<unknown>
  draftFileName: Ref<string>
  hasUnsavedFileChanges: Ref<boolean>
  confirmFn?: (message: string) => Promise<boolean>
}

export function useRelationshipActions(deps: RelationshipActionsDeps) {
  const {
    pub,
    statusMessage,
    errorMessage,
    editorOpen,
    layoutPanelOpen,
    historyOpen,
    markHistory,
    initializeHistoryBaseline,
    canvasRef,
    revealPersonInCanvas,
    shouldReplaceCurrentDraft,
    draftFileHandle,
    draftFileName,
    hasUnsavedFileChanges,
    confirmFn,
  } = deps

  async function confirm(message: string): Promise<boolean> {
    if (confirmFn) return confirmFn(message)
    return window.confirm(message)
  }

  const {
    publication,
    settings,
    selectedPersonId,
    selectedPerson,
    selectedSpouse,
    selectedParents,
    rootFamilyId,
    isPersonId,
    replaceReactiveObject,
    getDefaultSelectedPersonId,
  } = pub

  async function applyEditorAction(action: RelationshipAction, confirmation?: string) {
    if (confirmation && !(await confirm(confirmation))) return

    const result = applyRelationshipAction(publication, action)
    if (!result.ok) {
      errorMessage.value = formatValidationIssues(result.issues)
      statusMessage.value = ''
      return
    }

    errorMessage.value = ''
    markHistory(result.value.historyLabel)
    replaceReactiveObject(publication, result.value.publication)
    publication.focusFamilyId = result.value.focusFamilyId
    selectedPersonId.value = result.value.selectedPersonId
    editorOpen.value = Boolean(selectedPersonId.value)

    if (action.type === 'add-spouse' || action.type === 'add-child' || action.type === 'add-parents') {
      revealPersonInCanvas(result.value.selectedPersonId)
    }
  }

  function addSpouse() {
    if (selectedPerson.value) {
      applyEditorAction({ type: 'add-spouse', personId: selectedPerson.value.id })
    }
  }

  function addChild(gender: Gender) {
    if (selectedPerson.value) {
      applyEditorAction({ type: 'add-child', personId: selectedPerson.value.id, gender })
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

  function updateSelectedBranchMode(branchMode: FamilyBranchMode) {
    if (selectedPerson.value) {
      applyEditorAction({ type: 'set-branch-mode', personId: selectedPerson.value.id, branchMode })
    }
  }

  function returnToMainBranch() {
    const family = publication.families[rootFamilyId.value]
    if (!family) return

    const rootAdultId = family.adults.find(isPersonId)
    if (rootAdultId) {
      applyEditorAction({ type: 'focus-branch', personId: rootAdultId })
    } else {
      publication.focusFamilyId = family.id
      selectedPersonId.value = Object.keys(publication.people)[0] ?? ''
    }

    errorMessage.value = ''
    statusMessage.value = '已返回父系主谱'
    nextTick(() => {
      canvasRef.value?.resetView?.()
    })
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

  async function removeSpouseRelation() {
    const person = selectedPerson.value
    const spouse = selectedSpouse.value
    if (!person || !spouse) return
    await applyEditorAction(
      { type: 'remove-spouse', personId: person.id },
      `将解除 ${person.name} 与 ${spouse.name} 的配偶关系，是否继续？`,
    )
  }

  async function removeParentsRelation() {
    const person = selectedPerson.value
    if (!person || !selectedParents.value.length) return
    await applyEditorAction(
      { type: 'remove-parents', personId: person.id },
      `将解除 ${person.name} 与 ${selectedParents.value.map((parent) => parent.name).join('、')} 的父母关系，是否继续？`,
    )
  }

  async function deleteSelectedPerson() {
    const person = selectedPerson.value
    if (!person) return

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

    await applyEditorAction(
      { type: 'delete-person', personId: person.id },
      `将删除人物"${person.name}"。${summary ? `\n${summary}\n` : '\n'}是否继续？`,
    )
  }

  function createBlankDraft() {
    if (!shouldReplaceCurrentDraft()) return

    replaceReactiveObject(publication, structuredClone(blankPublication))
    replaceReactiveObject(settings, structuredClone(defaultSettings))
    selectedPersonId.value = getDefaultSelectedPersonId(blankPublication)
    draftFileHandle.value = null
    draftFileName.value = ''
    hasUnsavedFileChanges.value = true
    layoutPanelOpen.value = false
    editorOpen.value = true
    historyOpen.value = false
    errorMessage.value = ''
    statusMessage.value = '已新建空白族谱，可先修改始祖姓名，再继续补配偶和子女。'
    initializeHistoryBaseline()
    nextTick(() => {
      canvasRef.value?.resetView?.()
    })
  }

  return {
    applyEditorAction,
    addSpouse,
    addChild,
    addParents,
    focusSelectedBranch,
    updateSelectedBranchMode,
    returnToMainBranch,
    swapPartnerOrder,
    moveChild,
    removeSpouseRelation,
    removeParentsRelation,
    deleteSelectedPerson,
    createBlankDraft,
  }
}
