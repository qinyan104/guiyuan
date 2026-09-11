import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import type { PublicationSummary } from '../../api/publication'
import { usePublicationListFilters } from './usePublicationListFilters'

const publications: PublicationSummary[] = [
  {
    id: 1,
    title: '陈氏宗谱',
    subtitle: '测试卷',
    revision: 1,
    accessRole: 'OWNER',
    createdAt: '2026-05-10T12:00:00Z',
    updatedAt: '2026-05-12T12:00:00Z',
    info: { hallName: '崇本堂', ancestralOrigin: '颍川' },
  },
  {
    id: 2,
    title: '李氏世家',
    subtitle: '陇西堂谱',
    revision: 5,
    accessRole: 'EDITOR',
    createdAt: '2026-05-11T12:00:00Z',
    updatedAt: '2026-05-10T12:00:00Z',
    info: { hallName: '陇西堂', ancestralOrigin: '陇西' },
  },
]

describe('usePublicationListFilters', () => {
  it('filters by publication metadata and sorts by selected strategy', () => {
    const source = ref(publications)
    const { searchQuery, sortBy, filteredPublications } = usePublicationListFilters(source)

    searchQuery.value = '陇西'
    expect(filteredPublications.value.map((pub) => pub.title)).toEqual(['李氏世家'])

    searchQuery.value = ''
    sortBy.value = 'revision_desc'
    expect(filteredPublications.value.map((pub) => pub.title)).toEqual(['李氏世家', '陈氏宗谱'])

    sortBy.value = 'updatedAt_desc'
    expect(filteredPublications.value.map((pub) => pub.title)).toEqual(['陈氏宗谱', '李氏世家'])
  })
})
