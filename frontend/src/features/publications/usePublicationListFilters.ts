import { computed, ref, type Ref } from 'vue'

import type { PublicationSummary } from '../../api/publication'
import type { AppSelectOption } from '../../components/AppSelect.vue'

export const publicationSortOptions: AppSelectOption[] = [
  { value: 'updatedAt_desc', label: '最近更新' },
  { value: 'createdAt_desc', label: '最新创建' },
  { value: 'title_asc', label: '谱名拼音' },
  { value: 'revision_desc', label: '修缮次数' },
]

export function usePublicationListFilters(publications: Ref<PublicationSummary[]>) {
  const searchQuery = ref('')
  const sortBy = ref<string>('updatedAt_desc')

  const filteredPublications = computed(() => {
    let list = [...publications.value]
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        const matchTitle = (p.title || '').toLowerCase().includes(q)
        const matchSubtitle = (p.subtitle || '').toLowerCase().includes(q)
        const matchOrigin = (p.info?.ancestralOrigin || '').toLowerCase().includes(q)
        const matchHall = (p.info?.hallName || '').toLowerCase().includes(q)
        const matchDesc = (p.info?.description || '').toLowerCase().includes(q)
        return matchTitle || matchSubtitle || matchOrigin || matchHall || matchDesc
      })
    }

    list.sort((a, b) => {
      if (sortBy.value === 'updatedAt_desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sortBy.value === 'createdAt_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy.value === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'zh-CN')
      }
      if (sortBy.value === 'revision_desc') {
        return b.revision - a.revision
      }
      return 0
    })

    return list
  })

  return {
    searchQuery,
    sortBy,
    sortOptions: publicationSortOptions,
    filteredPublications,
  }
}
