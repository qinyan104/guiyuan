import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useLexiconStore } from './lexicon'

describe('lexicon store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('defaults to standard plain lexicon', () => {
    const store = useLexiconStore()
    expect(store.currentLexiconId).toBe('standard')
    expect(store.lexicon.name).toBe('常规通用')
    expect(store.lexicon.dashboard.label).toBe('工作台')
    expect(store.lexicon.publications.label).toBe('我的族谱')
    expect(store.lexicon.users.label).toBe('用户管理')
    expect(store.lexicon.logs.label).toBe('操作日志')
  })

  it('switches lexicon and updates computed lexicon reactively', async () => {
    const store = useLexiconStore()
    
    store.setLexicon('archive')
    await nextTick()
    expect(store.currentLexiconId).toBe('archive')
    expect(store.lexicon.name).toBe('史馆藏书')
    expect(store.lexicon.dashboard.statPubsLabel).toBe('馆藏总卷')
    expect(store.lexicon.dashboard.label).toBe('卷首')
    expect(localStorage.getItem('genealogy-lexicon-theme')).toBe('archive')

    store.setLexicon('shrine')
    await nextTick()
    expect(store.currentLexiconId).toBe('shrine')
    expect(store.lexicon.name).toBe('传统宗祠')
    expect(store.lexicon.dashboard.label).toBe('明堂')

    store.setLexicon('poetic')
    await nextTick()
    expect(store.currentLexiconId).toBe('poetic')
    expect(store.lexicon.name).toBe('雅致诗意')
    expect(store.lexicon.dashboard.label).toBe('溯源')

    store.setLexicon('standard')
    await nextTick()
    expect(store.currentLexiconId).toBe('standard')
    expect(store.lexicon.name).toBe('常规通用')
  })

  it('restores stored lexicon on initialize', () => {
    localStorage.setItem('genealogy-lexicon-theme', 'shrine')
    const store = useLexiconStore()
    expect(store.currentLexiconId).toBe('shrine')
    expect(store.lexicon.name).toBe('传统宗祠')
  })
})
