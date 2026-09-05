import { ref, computed } from 'vue'
import { LEXICONS, type LexiconId, type LexiconConfig } from '../stores/lexicon'

export type { LexiconId, LexiconConfig }
export { LEXICONS }

const STORAGE_KEY = 'genealogy-lexicon-theme'

const currentLexiconId = ref<LexiconId>('standard')

try {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && LEXICONS[stored as LexiconId]) {
    currentLexiconId.value = stored as LexiconId
  }
} catch { /* localStorage may be unavailable in private mode */ }

export function useLexicon() {
  function setLexicon(id: LexiconId) {
    currentLexiconId.value = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch { /* localStorage may be unavailable in private mode */ }
  }

  const lexicon = computed(() => LEXICONS[currentLexiconId.value])

  return {
    currentLexiconId,
    setLexicon,
    lexicon,
    lexicons: computed(() => Object.values(LEXICONS))
  }
}
