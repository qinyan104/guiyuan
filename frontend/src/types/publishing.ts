export interface BookDraft {
  id: number
  publicationId: number
  publicationTitle?: string
  title: string
  subtitle: string
  preface?: string
  epilogue?: string
  styleConfig?: BookStyleConfig
  status: "draft" | "review" | "final"
  version: number
  snapshotRevision: number
  createdBy?: number
  updatedBy?: number
  createdAt: string
  updatedAt: string
  sheetCount: number
}

export interface BookStyleConfig {
  paper: "A4" | "A3"
  fontFamily: string
  fontSize: number
  fishTailStyle: "single" | "double"
  sealStyle: string
}

export interface TraditionalLayoutOptions {
  paper: "A4" | "A3"
  cardWidth: number
  cardHeight: number
}

export interface PersonCardPlacement {
  personId: string
  x: number
  y: number
  generation: number
}

export interface LayoutPoint {
  x: number
  y: number
}

export interface LinePlacement {
  fromPersonId: string
  toPersonId: string
  points: LayoutPoint[]
}

export interface PageAnchor {
  direction: "top" | "bottom" | "left" | "right"
  label: string
  targetPage: number
}

export interface BookSheetLayout {
  sheetNumber: number
  sheetType: "genealogy"
  dimensions: {
    width: number
    height: number
  }
  rootPersonIds: string[]
  elements: {
    personCards: PersonCardPlacement[]
    connectionLines: LinePlacement[]
    anchors: PageAnchor[]
  }
  continuationOf?: number
  continuesTo?: number[]
}

export interface BookDraftRequest {
  publicationId: number
  title: string
  subtitle?: string
  preface?: string
  epilogue?: string
  styleConfig?: string
}

export interface BookPersonDetail {
  id: number
  personId: string
  personName?: string
  biography?: string
  interlinearNotes?: InterlinearNote[]
  sealStyle?: string
  userModified: boolean
  sourceFieldsHash?: string
  updatedAt: string
}

export interface InterlinearNote {
  startIndex: number
  endIndex: number
  line1: string
  line2: string
}

export interface BookPersonDetailRequest {
  personId: string
  biography?: string
  interlinearNotes?: string
  sealStyle?: string
  userModified?: boolean
}

export interface DraftSyncStatus {
  draftId: number
  currentRevision: number
  snapshotRevision: number
  hasPendingSync: boolean
  changes: DraftSyncEntry[]
}

export interface DraftSyncEntry {
  personId: string
  personName: string
  changeType: "added" | "removed" | "updated"
  acknowledged: boolean
}
