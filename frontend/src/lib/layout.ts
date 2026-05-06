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

// ─── Modern Style Layout (Existing) ──────────────────────────────

function measureNodeModern(node: TreeNode, settings: PublicationSettings): { generations: number } {
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
    const { generations } = measureNodeModern(child, settings)
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

function placeNodeModern(
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
    placeNodeModern(onlyChild, adultCenterX, childrenY, settings, cards, lines)
    childAnchors.push(adultCenterX)
  } else {
    let childStartX = adultCenterX - node.childrenRowWidth / 2

    node.children.forEach((child) => {
      const childAnchorX = childStartX + child.leftExtent
      placeNodeModern(child, childAnchorX, childrenY, settings, cards, lines)
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

// ─── Su Style Layout (Vertical / Indented) ───────────────────────

function measureNodeSu(node: TreeNode, settings: PublicationSettings): { generations: number } {
  const cardHeight = getCardHeight(settings.cardWidth)
  node.adultBlockWidth =
    node.adults.length * settings.cardWidth + Math.max(0, node.adults.length - 1) * settings.partnerGap
  node.adultAnchorOffset = 0 // Anchor top-left for Su style

  if (node.children.length === 0) {
    node.width = node.adultBlockWidth
    node.height = cardHeight
    return { generations: 1 }
  }

  let maxWidth = node.adultBlockWidth
  let totalHeight = cardHeight + settings.siblingGap // Initial height with gap
  let maxGenerations = 0

  node.children.forEach((child) => {
    const { generations } = measureNodeSu(child, settings)
    const indent = settings.cardWidth * 0.75
    maxWidth = Math.max(maxWidth, indent + child.width)
    totalHeight += child.height + settings.siblingGap
    maxGenerations = Math.max(maxGenerations, generations)
  })

  node.width = maxWidth
  node.height = totalHeight
  return { generations: maxGenerations + 1 }
}

function placeNodeSu(
  node: TreeNode,
  startX: number,
  startY: number,
  settings: PublicationSettings,
  cards: PositionedCard[],
  lines: LineSegment[],
) {
  const cardHeight = getCardHeight(settings.cardWidth)
  const indent = settings.cardWidth * 0.75
  const parentAnchorX = startX + settings.cardWidth / 2
  const parentAnchorY = startY + cardHeight

  // Place adults
  node.adults.forEach((adultId, index) => {
    cards.push({
      personId: adultId,
      x: startX + index * (settings.cardWidth + settings.partnerGap),
      y: startY,
      width: settings.cardWidth,
      height: cardHeight,
    })
  })

  // Horizontal partner line
  if (node.adults.length > 1) {
    const partnerY = startY + cardHeight / 2
    lines.push({
      x1: startX + settings.cardWidth,
      y1: partnerY,
      x2: startX + settings.cardWidth + settings.partnerGap,
      y2: partnerY,
    })
  }

  if (node.children.length === 0) return

  let currentY = startY + cardHeight + settings.siblingGap

  node.children.forEach((child, index) => {
    const childX = startX + indent
    const childY = currentY
    
    // Recursive place
    placeNodeSu(child, childX, childY, settings, cards, lines)

    // Connector: Parent Spine (Vertical)
    lines.push({
      x1: parentAnchorX,
      y1: index === 0 ? parentAnchorY : (currentY - settings.siblingGap),
      x2: parentAnchorX,
      y2: childY + cardHeight / 2,
    })

    // Connector: To Child (Horizontal)
    lines.push({
      x1: parentAnchorX,
      y1: childY + cardHeight / 2,
      x2: childX,
      y2: childY + cardHeight / 2,
    })

    currentY += child.height + settings.siblingGap
  })
}

// ─── Ou Style Layout (Grid / Traditional Matrix) ─────────────────

function measureNodeOu(node: TreeNode, settings: PublicationSettings): { generations: number } {
  // Ou style traditionally aligns everyone in the same generation to same row
  // We use modern measurement but might enforce more padding
  return measureNodeModern(node, settings)
}

function placeNodeOu(
  node: TreeNode,
  anchorX: number,
  originY: number,
  settings: PublicationSettings,
  cards: PositionedCard[],
  lines: LineSegment[],
) {
  // Use modern placement as base, but ensure grid alignment
  placeNodeModern(node, anchorX, originY, settings, cards, lines)
}

// ─── Main Entry ──────────────────────────────────────────────────

export function layoutPublication(data: PublicationData, settings: PublicationSettings): PublicationLayout {
  const paper = PAPER_PRESETS[settings.paper]
  const cards: PositionedCard[] = []
  const lines: LineSegment[] = []
  const adultFamilyMap = buildAdultFamilyMap(data.families)
  const rootFamilyId = data.families[data.focusFamilyId] ? data.focusFamilyId : Object.keys(data.families)[0]
  const tree = buildTreeNode(rootFamilyId, data, adultFamilyMap)

  let width = 0
  let height = 0
  let generations = 0

  if (settings.layoutMode === 'su') {
    const res = measureNodeSu(tree, settings)
    generations = res.generations
    width = tree.width + settings.paddingX * 2
    height = tree.height + settings.paddingY * 2
    placeNodeSu(tree, settings.paddingX, settings.paddingY, settings, cards, lines)
  } else {
    // Ou and Modern share same measurement for now
    const res = measureNodeModern(tree, settings)
    generations = res.generations
    width = tree.width + settings.paddingX * 2
    height = tree.height + settings.paddingY * 2
    const treeX = settings.paddingX + tree.leftExtent
    const treeY = settings.paddingY
    
    if (settings.layoutMode === 'ou') {
      placeNodeOu(tree, treeX, treeY, settings, cards, lines)
    } else {
      placeNodeModern(tree, treeX, treeY, settings, cards, lines)
    }
  }

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
