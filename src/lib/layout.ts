import type {
  FamilyUnit,
  LineSegment,
  PositionedCard,
  PublicationData,
  PublicationLayout,
  PublicationPaper,
  PublicationSettings,
} from '../types/family'

interface TreeNode {
  id: string
  adults: string[]
  entryPersonId?: string
  children: TreeNode[]
  width: number
  height: number
  adultBlockWidth: number
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
): TreeNode {
  const family = data.families[familyId]
  const familyAdults = family?.adults.filter(isPersonId) ?? []

  if (!family) {
    return {
      id: `missing:${familyId}`,
      adults: [],
      entryPersonId,
      children: [],
      width: 0,
      height: 0,
      adultBlockWidth: 0,
    }
  }

  const nextVisited = new Set(visited)
  nextVisited.add(familyId)

  const children = family.children.map((childId) => {
    const childFamilyId = adultFamilyMap.get(childId)
    if (childFamilyId && !nextVisited.has(childFamilyId)) {
      return buildTreeNode(childFamilyId, data, adultFamilyMap, nextVisited, childId)
    }

    return {
      id: `leaf:${childId}`,
      adults: [childId],
      entryPersonId: childId,
      children: [],
      width: 0,
      height: 0,
      adultBlockWidth: 0,
    }
  })

  return {
    id: familyId,
    adults: familyAdults,
    entryPersonId: entryPersonId ?? familyAdults[0],
    children,
    width: 0,
    height: 0,
    adultBlockWidth: 0,
  }
}

function measureNode(node: TreeNode, settings: PublicationSettings): { generations: number } {
  const cardHeight = getCardHeight(settings.cardWidth)
  node.adultBlockWidth =
    node.adults.length * settings.cardWidth + Math.max(0, node.adults.length - 1) * settings.partnerGap

  if (node.children.length === 0) {
    node.width = node.adultBlockWidth
    node.height = cardHeight
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

  node.width = Math.max(node.adultBlockWidth, childWidth)
  node.height = cardHeight + settings.generationGap + maxChildHeight

  return { generations: maxGenerations + 1 }
}

function placeNode(
  node: TreeNode,
  originX: number,
  originY: number,
  settings: PublicationSettings,
  cards: PositionedCard[],
  lines: LineSegment[],
): number {
  const cardHeight = getCardHeight(settings.cardWidth)
  const adultStartX = originX + (node.width - node.adultBlockWidth) / 2
  const adultCenterX = adultStartX + node.adultBlockWidth / 2
  const entryAdultIndex = node.entryPersonId ? node.adults.indexOf(node.entryPersonId) : -1
  const entryAnchorX =
    entryAdultIndex >= 0
      ? adultStartX + entryAdultIndex * (settings.cardWidth + settings.partnerGap) + settings.cardWidth / 2
      : adultCenterX

  node.adults.forEach((adultId, index) => {
    cards.push({
      personId: adultId,
      x: adultStartX + index * (settings.cardWidth + settings.partnerGap),
      y: originY,
      width: settings.cardWidth,
      height: cardHeight,
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
    return entryAnchorX
  }

  const childrenY = originY + cardHeight + settings.generationGap
  const childBarY = childrenY - 48
  let childStartX = originX + (node.width - getChildrenRowWidth(node, settings)) / 2
  const childAnchors: number[] = []

  node.children.forEach((child) => {
    const childAnchorX = placeNode(child, childStartX, childrenY, settings, cards, lines)
    childAnchors.push(childAnchorX)
    childStartX += child.width + settings.siblingGap
  })

  const parentAnchorY = node.adults.length > 1 ? originY + cardHeight / 2 : originY + cardHeight

  lines.push({
    x1: adultCenterX,
    y1: parentAnchorY,
    x2: adultCenterX,
    y2: childBarY,
  })

  if (childAnchors.length > 1) {
    lines.push({
      x1: childAnchors[0],
      y1: childBarY,
      x2: childAnchors[childAnchors.length - 1],
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

  return entryAnchorX
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
  const treeX = (width - tree.width) / 2
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
