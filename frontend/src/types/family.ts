export type Gender = 'male' | 'female' | 'unknown'
export type PublicationPaper = 'A4' | 'A3'
export type FamilyBranchMode = 'married-out' | 'uxorilocal'

export interface Person {
  id: string
  name: string
  gender: Gender
  birth?: string
  death?: string
  deceased?: boolean
  age?: string
  titleName?: string
  clan?: string
  note?: string
  avatarUrl?: string
  highlightRole?: 'emperor' | 'heir'
  isMountPoint?: boolean
  mountPointTarget?: {
    publicationId: number
    publicationTitle?: string
    rootPersonId?: number
  }
}

export interface FamilyUnit {
  id: string
  adults: string[]
  children: string[]
  branchMode?: FamilyBranchMode
}

export interface PublicationInfo {
  description?: string
  ancestralOrigin?: string
  hallName?: string
  familyMotto?: string
  revisionNotes?: string
}

export interface PublicationData {
  title: string
  subtitle: string
  focusFamilyId: string
  people: Record<string, Person>
  families: Record<string, FamilyUnit>
  info?: PublicationInfo
}

export interface PublicationSettings {
  paper: PublicationPaper
  layoutMode: 'modern' | 'su' | 'ou'
  cardWidth: number
  generationGap: number
  siblingGap: number
  partnerGap: number
  fontScale: number
  zoom: number
  showDeath: boolean
  showAge: boolean
  showNote: boolean
  showPhoto: boolean
  paddingX: number
  paddingY: number
}

export interface PositionedCard {
  personId: string
  x: number
  y: number
  width: number
  height: number
  lineageRole?: 'married-out' | 'uxorilocal' | 'in-law'
}

export interface LineSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PublicationLayout {
  width: number
  height: number
  cards: PositionedCard[]
  lines: LineSegment[]
  displayedPeople: number
  generationCount: number
  pageCount: number
  paperPixelWidth: number
  paperPixelHeight: number
  titleAreaHeight: number
}

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
