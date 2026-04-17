export type Gender = 'male' | 'female' | 'unknown'
export type PublicationPaper = 'A4' | 'A3'

export interface Person {
  id: string
  name: string
  gender: Gender
  birth?: string
  death?: string
  age?: string
  note?: string
}

export interface FamilyUnit {
  id: string
  adults: string[]
  children: string[]
}

export interface PublicationData {
  title: string
  subtitle: string
  focusFamilyId: string
  people: Record<string, Person>
  families: Record<string, FamilyUnit>
}

export interface PublicationSettings {
  paper: PublicationPaper
  cardWidth: number
  generationGap: number
  siblingGap: number
  partnerGap: number
  fontScale: number
  zoom: number
  showDeath: boolean
  showAge: boolean
  showNote: boolean
  paddingX: number
  paddingY: number
}

export interface PositionedCard {
  personId: string
  x: number
  y: number
  width: number
  height: number
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
