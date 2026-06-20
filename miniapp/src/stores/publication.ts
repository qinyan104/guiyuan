import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPublicationTree, listPublications } from '../api/auth'

/** 与后端 types/Person.java 对应 */
export interface Person {
  id: string
  name: string
  gender: 'male' | 'female' | 'unknown'
  birth?: string
  death?: string
  deceased?: boolean
  age?: string
  titleName?: string
  clan?: string
  note?: string
}

/** 与后端 types/FamilyUnit.java 对应 */
export interface FamilyUnit {
  id: string
  adults: string[]
  children: string[]
  branchMode?: string
}

export interface PublicationData {
  title: string
  subtitle: string
  focusFamilyId: string
  people: Record<string, Person>
  families: Record<string, FamilyUnit>
}

export interface PublicationSummary {
  id: number
  title: string
  subtitle: string
  accessRole: string
  updatedAt: string
}

export const usePublicationStore = defineStore('publication', () => {
  const publications = ref<PublicationSummary[]>([])
  const currentPubId = ref<number | null>(null)
  const currentPub = ref<PublicationData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadPublications() {
    loading.value = true
    error.value = null
    try {
      publications.value = await listPublications()
    } catch (err: any) {
      error.value = err.message || '获取族谱列表失败'
    } finally {
      loading.value = false
    }
  }

  async function loadTree(pubId: number) {
    loading.value = true
    error.value = null
    currentPubId.value = pubId
    try {
      const data = await getPublicationTree(pubId)
      currentPub.value = data.publication
    } catch (err: any) {
      error.value = err.message || '获取族谱数据失败'
    } finally {
      loading.value = false
    }
  }

  function getPerson(personId: string): Person | undefined {
    return currentPub.value?.people[personId]
  }

  function getFamily(familyId: string): FamilyUnit | undefined {
    return currentPub.value?.families[familyId]
  }

  function findPersonByName(name: string): Person[] {
    if (!currentPub.value) return []
    return Object.values(currentPub.value.people).filter(
      (p) => p.name && p.name.includes(name)
    )
  }

  return {
    publications, currentPubId, currentPub, loading, error,
    loadPublications, loadTree, getPerson, getFamily, findPersonByName,
  }
})
