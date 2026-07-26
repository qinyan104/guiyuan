export type BookBlockType = "cover" | "generationHeading" | "person" | "pageBreak"

export interface BookLayout {
  templateId: string
  fontFamily: string
  fontSize: number
  marginPreset: "compact" | "standard" | "loose"
}

export interface CoverBlock {
  type: "cover"
  title: string
  subtitle?: string
}

export interface GenerationHeadingBlock {
  type: "generationHeading"
  generation: number
  text: string
}

export interface PersonBlock {
  type: "person"
  personId: string
  personName: string
  generation: number
  text: string
}

export interface PageBreakBlock {
  type: "pageBreak"
  id: string
}

export type BookBlock = CoverBlock | GenerationHeadingBlock | PersonBlock | PageBreakBlock

export interface BookDocument {
  id?: number
  publicationId: number
  title: string
  layout: BookLayout
  blocks: BookBlock[]
  createdAt?: string
  updatedAt?: string
}

export interface BookPageBlock {
  block: BookBlock
  blockIndex: number
}

export interface BookPageLayout {
  pageNumber: number
  blocks: BookPageBlock[]
}

export const DEFAULT_BOOK_LAYOUT: BookLayout = {
  templateId: "classic",
  fontFamily: "qiji-combo",
  fontSize: 18,
  marginPreset: "standard",
}
