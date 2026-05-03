import type { Gender, Person, PublicationData } from '../types/family'
import { samplePublication } from './sampleFamily'

type ImperialHighlightRole = NonNullable<Person['highlightRole']>

interface SuccessionSampleRuler {
  name: string
  note: string
  gender?: Gender
  birth?: string
  death?: string
  deceased?: boolean
  highlightRole?: ImperialHighlightRole
  displayName?: string
  titleName?: string
  clan?: string
}

interface SuccessionSampleRelative {
  name: string
  note: string
  gender?: Gender
  birth?: string
  death?: string
  deceased?: boolean
  highlightRole?: ImperialHighlightRole
  displayName?: string
  titleName?: string
  clan?: string
}

interface SuccessionSampleBranch {
  parent: string
  children: Array<string | SuccessionSampleRelative>
}

interface SuccessionSampleDefinition {
  id: string
  label: string
  group: string
  title?: string
  subtitle?: string
  rulers: SuccessionSampleRuler[]
  branches?: SuccessionSampleBranch[]
}

export interface BuiltinSampleRecord {
  id: string
  label: string
  group: string
  publication: PublicationData
}

export interface BuiltinSampleGroup {
  label: string
  samples: Array<Pick<BuiltinSampleRecord, 'id' | 'label'>>
}

type HistoricalRulerProfile = Pick<
  SuccessionSampleRuler,
  'birth' | 'death' | 'note' | 'displayName' | 'titleName' | 'clan'
>

const dynastyClanProfiles: Record<string, string> = {
  tang: '陇西李氏 · 唐王室',
}

const personClanOverrides: Record<string, Record<string, string>> = {}

const historicalRulerProfiles: Record<string, Record<string, HistoricalRulerProfile>> = {
  tang: {
    唐高祖: { birth: '566年', death: '635年', note: '高祖·李渊' },
    唐太宗: { birth: '598年', death: '649年', note: '太宗·李世民' },
    唐高宗: { birth: '628年', death: '683年', note: '高宗·李治' },
    唐中宗: { birth: '656年', death: '710年', note: '中宗·李显' },
    唐睿宗: { birth: '662年', death: '716年', note: '睿宗·李旦' },
    唐玄宗: { birth: '685年', death: '762年', note: '玄宗·李隆基' },
    唐肃宗: { birth: '711年', death: '762年', note: '肃宗·李亨' },
    唐代宗: { birth: '726年', death: '779年', note: '代宗·李豫' },
    唐德宗: { birth: '742年', death: '805年', note: '德宗·李适' },
    唐宪宗: { birth: '778年', death: '820年', note: '宪宗·李纯' },
    唐文宗: { birth: '809年', death: '840年', note: '文宗·李昂' },
    唐宣宗: { birth: '810年', death: '859年', note: '宣宗·李忱' },
    唐僖宗: { birth: '862年', death: '888年', note: '僖宗·李儇' },
    唐昭宗: { birth: '867年', death: '904年', note: '昭宗·李晔' },
    唐哀帝: { birth: '892年', death: '908年', note: '哀帝·李柷' },
  },
}

function resolveHistoricalRuler(
  sampleId: string,
  ruler: SuccessionSampleRuler | SuccessionSampleRelative,
): SuccessionSampleRuler | SuccessionSampleRelative {
  const profile = historicalRulerProfiles[sampleId]?.[ruler.name]
  const historicalPresentation = profile?.note
    ? inferImperialPresentation({
        ...ruler,
        note: profile.note,
        displayName: profile.displayName,
        titleName: profile.titleName,
      })
    : undefined

  return {
    ...profile,
    ...ruler,
    displayName: ruler.displayName ?? profile?.displayName ?? historicalPresentation?.displayName,
    titleName: ruler.titleName ?? profile?.titleName ?? historicalPresentation?.titleName,
    deceased: ruler.deceased ?? true,
  }
}

function looksLikePersonalName(value: string): boolean {
  if (!/^[\p{Script=Han}A-Za-z·]+$/u.test(value)) return false
  if (value.length > 12) return false
  return !/(之|为|时期|中兴|建国|即位|在位|亡国|复位|称帝|末主|嫡系|后代|先君)/.test(value)
}

function inferImperialPresentation(
  member: SuccessionSampleRuler | SuccessionSampleRelative,
): { displayName: string; titleName?: string } {
  if (member.displayName || member.titleName) {
    return {
      displayName: member.displayName ?? member.name,
      titleName: member.titleName,
    }
  }

  const [noteTitle, noteTail] = member.note.split('·', 2)
  const hasTitleMarker = /[帝王宗主侯公祖皇]/.test(member.name)
  const displayName =
    hasTitleMarker && noteTail && looksLikePersonalName(noteTail) ? noteTail : member.name
  const titleName = (() => {
    const value = hasTitleMarker ? member.name : noteTitle || undefined
    return value === displayName ? undefined : value
  })()

  return { displayName, titleName }
}

function createSuccessionSample(definition: SuccessionSampleDefinition): PublicationData {
  const people: PublicationData['people'] = {}
  const families: PublicationData['families'] = {}
  const personIdByName = new Map<string, string>()
  const familyIdByAdultId = new Map<string, string>()
  let personCounter = 1
  let familyCounter = 1

  function createPerson(
    rawMember: SuccessionSampleRuler | SuccessionSampleRelative,
    defaultHighlightRole?: ImperialHighlightRole,
  ): string {
    const member = resolveHistoricalRuler(definition.id, rawMember)
    const presentation = inferImperialPresentation(member)
    const personId = `p${personCounter++}`
    personIdByName.set(member.name, personId)
    personIdByName.set(presentation.displayName, personId)
    people[personId] = {
      id: personId,
      name: presentation.displayName,
      gender: member.gender ?? 'male',
      birth: member.birth,
      death: member.death,
      deceased: member.deceased ?? true,
      titleName: presentation.titleName,
      clan: member.clan ?? personClanOverrides[definition.id]?.[member.name] ?? dynastyClanProfiles[definition.id],
      note: member.note,
      highlightRole: member.highlightRole ?? defaultHighlightRole,
    }
    return personId
  }

  function ensureFamily(adultId: string): string {
    const existingFamilyId = familyIdByAdultId.get(adultId)
    if (existingFamilyId) {
      return existingFamilyId
    }

    const familyId = `f${familyCounter++}`
    familyIdByAdultId.set(adultId, familyId)
    families[familyId] = {
      id: familyId,
      adults: [adultId],
      children: [],
    }
    return familyId
  }

  function resolveChild(child: string | SuccessionSampleRelative): string {
    if (typeof child === 'string') {
      const existingId = personIdByName.get(child)
      if (!existingId) {
        throw new Error(`未找到王朝示例人物：${child}`)
      }
      return existingId
    }

    const existingId = personIdByName.get(child.name)
    if (existingId) {
      return existingId
    }

    return createPerson(child)
  }

  const rulerIds = definition.rulers.map((ruler) => createPerson(ruler, 'emperor'))

  rulerIds.forEach((adultId, index) => {
    const familyId = ensureFamily(adultId)
    const childId = index < rulerIds.length - 1 ? rulerIds[index + 1] : null
    families[familyId].children = childId ? [childId] : []
  })

  definition.branches?.forEach((branch) => {
    const parentId = personIdByName.get(branch.parent)
    if (!parentId) {
      throw new Error(`未找到王朝示例父节点：${branch.parent}`)
    }

    const familyId = ensureFamily(parentId)
    families[familyId].children = branch.children.map(resolveChild)
  })

  return {
    title: definition.title ?? `${definition.label}世系示例图`,
    subtitle:
      definition.subtitle ?? '按关键君主串联皇统承续关系进行简化建模，便于快速预览前端排版效果。',
    focusFamilyId: 'f1',
    people,
    families,
  }
}

const successionSampleDefinitions: SuccessionSampleDefinition[] = [
  {
    id: 'tang',
    label: '唐朝',
    group: '隋唐五代',
    rulers: [
      { name: '唐高祖', note: '李渊建唐' },
      { name: '唐太宗', note: '贞观之治' },
      { name: '唐高宗', note: '永徽之治' },
      { name: '唐中宗', note: '神龙复辟' },
      { name: '唐睿宗', note: '让位玄宗' },
      { name: '唐玄宗', note: '开元盛世' },
      { name: '唐肃宗', note: '安史之乱中继位' },
      { name: '唐代宗', note: '乱后收束' },
      { name: '唐德宗', note: '中唐转折' },
      { name: '唐宪宗', note: '元和中兴' },
      { name: '唐文宗', note: '甘露之变时期' },
      { name: '唐宣宗', note: '大中之治' },
      { name: '唐僖宗', note: '黄巢之乱时期' },
      { name: '唐昭宗', note: '晚唐乱局' },
      { name: '唐哀帝', note: '唐朝末帝' },
    ],
    branches: [
      {
        parent: '唐太宗',
        children: [
          { name: '李承乾', birth: '619年', death: '645年', note: '废太子·李承乾', highlightRole: 'heir' },
          '唐高宗',
        ],
      },
      {
        parent: '唐高宗',
        children: [
          { name: '李弘', birth: '652年', death: '675年', note: '孝敬皇帝·李弘', highlightRole: 'heir' },
          '唐中宗',
          '唐睿宗',
        ],
      },
      {
        parent: '唐中宗',
        children: [],
      },
      {
        parent: '唐睿宗',
        children: ['唐玄宗'],
      },
      {
        parent: '唐玄宗',
        children: [
          { name: '李瑛', death: '737年', note: '废太子·李瑛', highlightRole: 'heir' },
          '唐肃宗',
        ],
      },
    ],
  },
]

export const defaultSampleId = 'ming'

export const builtinSamples: BuiltinSampleRecord[] = [
  ...successionSampleDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    group: definition.group,
    publication: createSuccessionSample(definition),
  })),
  {
    id: 'ming',
    label: '明朝',
    group: '宋辽夏金元明清',
    publication: samplePublication,
  },
]

const builtinSampleIndex = new Map(builtinSamples.map((sample) => [sample.id, sample]))

export function getBuiltinSampleById(id: string): BuiltinSampleRecord | undefined {
  return builtinSampleIndex.get(id)
}

export const builtinSampleGroups: BuiltinSampleGroup[] = (() => {
  const groups = new Map<string, BuiltinSampleGroup>()

  for (const sample of builtinSamples) {
    const existingGroup = groups.get(sample.group)
    if (existingGroup) {
      existingGroup.samples.push({ id: sample.id, label: sample.label })
      continue
    }

    groups.set(sample.group, {
      label: sample.group,
      samples: [{ id: sample.id, label: sample.label }],
    })
  }

  return Array.from(groups.values())
})()
