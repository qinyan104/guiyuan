import type {
  FamilyBranchMode,
  FamilyUnit,
  LineSegment,
  PositionedCard,
  PublicationData,
  PublicationLayout,
  PublicationPaper,
  PublicationSettings,
} from '../types/family'
import { resolveFamilyBranchMode } from './familyBranchMode'

interface TreeNode {
  id: string
  adults: string[]
  branchMode?: FamilyBranchMode
  entryPersonId?: string
  outMarriageEntryPersonId?: string
  inLawAdultIds: string[]
  children: TreeNode[]
  width: number
  height: number
  adultBlockWidth: number
  adultAnchorOffset: number
  leftExtent: number
  rightExtent: number
  childrenRowWidth: number
}

const TITLE_AREA_HEIGHT = 0

export const PAPER_PRESETS: Record<PublicationPaper, { width: number; height: number }> = {
  A4: { width: 1123, height: 794 },
  A3: { width: 1587, height: 1123 },
}

function getCardHeight(cardWidth: number): number {
  return Math.round(cardWidth * 1.84)
}

function isPersonId(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

function buildAdultFamilyMap(families: Record<string, FamilyUnit>): Map<string, string> {
  const map = new Map<string, string>()

  Object.values(families).forEach((family) => {
    family.adults.filter(isPersonId).forEach((adultId) => {
      if (!map.has(adultId)) {
        map.set(adultId, family.id)
      }
    })
  })

  return map
}

function buildTreeNode(
  familyId: string,
  data: PublicationData,
  adultFamilyMap: Map<string, string>,
  visited = new Set<string>(),
  entryPersonId?: string,
  outMarriageEntryPersonId?: string,
): TreeNode {
  const family = data.families[familyId]
  const familyAdults = family?.adults.filter(isPersonId) ?? []
  const branchMode = family ? resolveFamilyBranchMode(data, familyId) : undefined

  if (!family) {
    return {
      id: `missing:${familyId}`,
      adults: [],
      branchMode,
      entryPersonId,
      outMarriageEntryPersonId,
      inLawAdultIds: [],
      children: [],
      width: 0,
      height: 0,
      adultBlockWidth: 0,
      adultAnchorOffset: 0,
      leftExtent: 0,
      rightExtent: 0,
      childrenRowWidth: 0,
    }
  }

  const nextVisited = new Set(visited)
  nextVisited.add(familyId)

  const children = family.children.map((childId) => {
    const child = data.people[childId]
    const childFamilyId = adultFamilyMap.get(childId)
    if (childFamilyId && !nextVisited.has(childFamilyId)) {
      const branchMode = resolveFamilyBranchMode(data, childFamilyId)
      if (branchMode === 'married-out') {
        const node = buildTreeNode(childFamilyId, data, adultFamilyMap, nextVisited, childId, childId)
        node.inLawAdultIds = node.adults.filter((adultId) => adultId !== childId)
        return node
      }

      const node = buildTreeNode(childFamilyId, data, adultFamilyMap, nextVisited, childId)
      if (branchMode === 'uxorilocal') {
        node.inLawAdultIds = node.adults.filter((adultId) => adultId !== childId)
      }

      return node
    }

    return {
      id: `leaf:${childId}`,
      adults: [childId],
      branchMode: undefined,
      entryPersonId: childId,
      outMarriageEntryPersonId: undefined,
      inLawAdultIds: [],
      children: [],
      width: 0,
      height: 0,
      adultBlockWidth: 0,
      adultAnchorOffset: 0,
      leftExtent: 0,
      rightExtent: 0,
      childrenRowWidth: 0,
    }
  })

  return {
    id: familyId,
    adults: familyAdults,
    branchMode,
    entryPersonId,
    outMarriageEntryPersonId,
    inLawAdultIds: [],
    children,
    width: 0,
    height: 0,
    adultBlockWidth: 0,
    adultAnchorOffset: 0,
    leftExtent: 0,
    rightExtent: 0,
    childrenRowWidth: 0,
  }
}

function measureNode(node: TreeNode, settings: PublicationSettings): { generations: number } {
  const cardHeight = getCardHeight(settings.cardWidth)
  node.adultBlockWidth =
    node.adults.length * settings.cardWidth + Math.max(0, node.adults.length - 1) * settings.partnerGap
  const entryAdultIndex = node.entryPersonId ? node.adults.indexOf(node.entryPersonId) : -1
  node.adultAnchorOffset =
    entryAdultIndex >= 0
      ? entryAdultIndex * (settings.cardWidth + settings.partnerGap) + settings.cardWidth / 2
      : node.adultBlockWidth / 2

  if (node.children.length === 0) {
    node.leftExtent = node.adultAnchorOffset
    node.rightExtent = node.adultBlockWidth - node.adultAnchorOffset
    node.width = node.leftExtent + node.rightExtent
    node.height = cardHeight
    node.childrenRowWidth = 0
    return { generations: 1 }
  }

  let childWidth = 0
  let maxChildHeight = 0
  let maxGenerations = 0

  node.children.forEach((child, index) => {
    const { generations } = measureNode(child, settings)
    childWidth += child.width
    if (index > 0) {
      childWidth += settings.siblingGap
    }
    maxChildHeight = Math.max(maxChildHeight, child.height)
    maxGenerations = Math.max(maxGenerations, generations)
  })

  node.childrenRowWidth = childWidth

  if (node.children.length === 1) {
    const onlyChild = node.children[0]
    const childAnchorOffset = node.adultBlockWidth / 2 - node.adultAnchorOffset

    node.leftExtent = Math.max(node.adultAnchorOffset, onlyChild.leftExtent - childAnchorOffset)
    node.rightExtent = Math.max(node.adultBlockWidth - node.adultAnchorOffset, childAnchorOffset + onlyChild.rightExtent)
  } else {
    const childCenterOffset = node.adultBlockWidth / 2 - node.adultAnchorOffset

    node.leftExtent = Math.max(node.adultAnchorOffset, childWidth / 2 - childCenterOffset)
    node.rightExtent = Math.max(node.adultBlockWidth - node.adultAnchorOffset, childWidth / 2 + childCenterOffset)
  }

  node.width = node.leftExtent + node.rightExtent
  node.height = cardHeight + settings.generationGap + maxChildHeight

  return { generations: maxGenerations + 1 }
}

function placeNode(
  node: TreeNode,
  anchorX: number,
  originY: number,
  settings: PublicationSettings,
  cards: PositionedCard[],
  lines: LineSegment[],
): number {
  const cardHeight = getCardHeight(settings.cardWidth)
  const adultStartX = anchorX - node.adultAnchorOffset
  const adultCenterX = adultStartX + node.adultBlockWidth / 2

  node.adults.forEach((adultId, index) => {
    const lineageRole = node.outMarriageEntryPersonId
      ? adultId === node.outMarriageEntryPersonId
        ? 'married-out'
        : node.inLawAdultIds.includes(adultId)
          ? 'in-law'
          : undefined
      : node.branchMode === 'uxorilocal' && adultId === node.entryPersonId
        ? 'uxorilocal'
        : node.inLawAdultIds.includes(adultId)
          ? 'in-law'
          : undefined

    cards.push({
      personId: adultId,
      x: adultStartX + index * (settings.cardWidth + settings.partnerGap),
      y: originY,
      width: settings.cardWidth,
      height: cardHeight,
      lineageRole,
    })
  })

  if (node.adults.length > 1) {
    const leftCardX = adultStartX
    const rightCardX = adultStartX + settings.cardWidth + settings.partnerGap
    const partnerY = originY + cardHeight / 2

    lines.push({
      x1: leftCardX + settings.cardWidth,
      y1: partnerY,
      x2: rightCardX,
      y2: partnerY,
    })
  }

  if (node.children.length === 0) {
    return anchorX
  }

  const childrenY = originY + cardHeight + settings.generationGap
  const childBarY = childrenY - 48
  const childAnchors: number[] = []

  if (node.children.length === 1) {
    const onlyChild = node.children[0]
    placeNode(onlyChild, adultCenterX, childrenY, settings, cards, lines)
    childAnchors.push(adultCenterX)
  } else {
    let childStartX = adultCenterX - node.childrenRowWidth / 2

    node.children.forEach((child) => {
      const childAnchorX = childStartX + child.leftExtent
      placeNode(child, childAnchorX, childrenY, settings, cards, lines)
      childAnchors.push(childAnchorX)
      childStartX += child.width + settings.siblingGap
    })
  }

  const parentAnchorY = node.adults.length > 1 ? originY + cardHeight / 2 : originY + cardHeight

  lines.push({
    x1: adultCenterX,
    y1: parentAnchorY,
    x2: adultCenterX,
    y2: childBarY,
  })

  const barStartX = Math.min(adultCenterX, childAnchors[0])
  const barEndX = Math.max(adultCenterX, childAnchors[childAnchors.length - 1])

  if (barStartX !== barEndX) {
    lines.push({
      x1: barStartX,
      y1: childBarY,
      x2: barEndX,
      y2: childBarY,
    })
  }

  childAnchors.forEach((childAnchorX) => {
    lines.push({
      x1: childAnchorX,
      y1: childBarY,
      x2: childAnchorX,
      y2: childrenY,
    })
  })

  return anchorX
}

function getChildrenRowWidth(node: TreeNode, settings: PublicationSettings): number {
  return node.children.reduce((total, child, index) => total + child.width + (index > 0 ? settings.siblingGap : 0), 0)
}

export function layoutPublication(data: PublicationData, settings: PublicationSettings): PublicationLayout {
  const paper = PAPER_PRESETS[settings.paper]
  const cards: PositionedCard[] = []
  const lines: LineSegment[] = []
  const adultFamilyMap = buildAdultFamilyMap(data.families)
  const rootFamilyId = data.families[data.focusFamilyId] ? data.focusFamilyId : Object.keys(data.families)[0]
  const tree = buildTreeNode(rootFamilyId, data, adultFamilyMap)
  const { generations } = measureNode(tree, settings)

  const rawWidth = tree.width + settings.paddingX * 2
  const rawHeight = TITLE_AREA_HEIGHT + tree.height + settings.paddingY * 2
  const width = rawWidth
  const height = rawHeight
  const treeX = settings.paddingX + tree.leftExtent
  const treeY = TITLE_AREA_HEIGHT + settings.paddingY

  placeNode(tree, treeX, treeY, settings, cards, lines)

  return {
    width,
    height,
    cards,
    lines,
    displayedPeople: cards.length,
    generationCount: generations,
    pageCount: Math.max(1, Math.ceil(width / paper.width) * Math.ceil(height / paper.height)),
    paperPixelWidth: paper.width,
    paperPixelHeight: paper.height,
    titleAreaHeight: TITLE_AREA_HEIGHT,
  }
}
