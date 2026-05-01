import { computed } from 'vue'

import { hasPersonLifeRecord } from '../lib/personStatus'
import type { PublicationStateReturn } from './usePublicationState'

export function usePublicationMetrics(pub: PublicationStateReturn) {
  const {
    peopleList,
    totalPeople,
    layout,
    settings,
    aliveCount,
    deceasedCount,
    focusFamily,
  } = pub

  const documentedFieldCount = computed(() =>
    peopleList.value.reduce(
      (total, person) =>
        total +
        Number(Boolean(person.birth)) +
        Number(Boolean(hasPersonLifeRecord(person))) +
        Number(Boolean(person.note)),
      0,
    ),
  )

  const documentationTotal = computed(() => totalPeople.value * 3)

  const documentationScore = computed(() =>
    documentationTotal.value
      ? Math.round((documentedFieldCount.value / documentationTotal.value) * 100)
      : 0,
  )

  const metricCards = computed(() => [
    {
      id: 'people',
      label: '入谱人物',
      value: `${layout.value.displayedPeople}人`,
      meta: `在世 ${aliveCount.value} · 已故 ${deceasedCount.value}`,
      progress: totalPeople.value
        ? Math.round((layout.value.displayedPeople / totalPeople.value) * 100)
        : 0,
      tone: 'amber',
    },
    {
      id: 'documentation',
      label: '信息完整度',
      value: `${documentationScore.value}%`,
      meta: `已填 ${documentedFieldCount.value} / ${documentationTotal.value} 项`,
      progress: documentationScore.value,
      tone: 'ink',
    },
    {
      id: 'generation',
      label: '代际深度',
      value: `${layout.value.generationCount}代`,
      meta: `当前宗支包含 ${focusFamily.value?.children.length ?? 0} 位子代`,
      progress: Math.min(100, layout.value.generationCount * 18),
      tone: 'olive',
    },
    {
      id: 'page',
      label: '出版分页',
      value: `${layout.value.pageCount}页`,
      meta: `${settings.paper} 横向 · 缩放 ${Math.round(settings.zoom * 100)}%`,
      progress: Math.min(100, 28 + layout.value.pageCount * 14),
      tone: 'earth',
    },
  ])

  const taskCards = computed(() => {
    const missingBirth = peopleList.value.filter((person) => !person.birth).length
    const missingLife = peopleList.value.filter((person) => !hasPersonLifeRecord(person)).length
    const missingNote = peopleList.value.filter((person) => !person.note).length

    return [
      {
        id: 'birth',
        title: '出生待补全',
        count: missingBirth,
        description: '出生时间会影响代际排序和出版纪年。',
        tone: 'urgent',
      },
      {
        id: 'life',
        title: '生平待补全',
        count: missingLife,
        description: '建议至少保留卒年或享年。',
        tone: 'warm',
      },
      {
        id: 'note',
        title: '注记待补全',
        count: missingNote,
        description: '房次、排行和支系身份适合写在注记中。',
        tone: 'calm',
      },
    ]
  })

  return {
    documentedFieldCount,
    documentationTotal,
    documentationScore,
    metricCards,
    taskCards,
  }
}
