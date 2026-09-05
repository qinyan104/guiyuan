import { ref, computed } from 'vue'

export type LexiconId = 'standard' | 'archive' | 'shrine' | 'poetic'

export interface LexiconConfig {
  id: LexiconId
  name: string
  logo: { seal: string; title: string; subtitle: string }
  footerQuote: string
  dashboard: { label: string; soul: string; headerEyebrow: string; headerTitle: string; headerTitleItalic: string; quote: string }
  publications: { label: string; soul: string; headerEyebrow: string; headerTitle: string; headerTitleItalic: string; quote: string }
  users: { label: string; soul: string; headerEyebrow: string; headerTitle: string; headerTitleItalic: string; quote: string }
  logs: { label: string; soul: string; headerEyebrow: string; headerTitle: string; headerTitleItalic: string; quote: string }
  settings: { soul: string }
}

export const LEXICONS: Record<LexiconId, LexiconConfig> = {
  standard: {
    id: 'standard',
    name: '常规通用',
    logo: { seal: '谱', title: '归源 · 家谱', subtitle: 'GENEALOGY SYSTEM' },
    footerQuote: '传承家族记忆，守护宗谱档案',
    dashboard: { label: '工作台', soul: '台', headerEyebrow: '系统概览', headerTitle: '工作台', headerTitleItalic: '概览', quote: '数字化族谱管理系统，清晰记录家族世系与档案数据。' },
    publications: { label: '我的族谱', soul: '谱', headerEyebrow: '族谱管理', headerTitle: '我的族谱', headerTitleItalic: '列表', quote: '妥善编修与管理每一部宗谱，规范归档家族历史记忆。' },
    users: { label: '用户管理', soul: '户', headerEyebrow: '账号权限', headerTitle: '用户管理', headerTitleItalic: '名录', quote: '管理系统成员账号与权限角色，协同维护宗谱档案。' },
    logs: { label: '操作日志', soul: '志', headerEyebrow: '审计日志', headerTitle: '操作日志', headerTitleItalic: '审计', quote: '详细记录系统每一次操作与变更，保障档案安全可追溯。' },
    settings: { soul: '设' }
  },
  archive: {
    id: 'archive',
    name: '史馆藏书',
    logo: { seal: '史', title: '史馆 · 典藏', subtitle: 'DIGITAL ARCHIVE' },
    footerQuote: '岁月失语，唯石能言',
    dashboard: { label: '卷首', soul: '源', headerEyebrow: '卷之一 · 总览', headerTitle: '族谱', headerTitleItalic: '卷首', quote: '家族史是一条奔流不息的长河，\\n我们在此记录每一个浪花的归宿。' },
    publications: { label: '典藏', soul: '藏', headerEyebrow: '卷之二 · 谱目', headerTitle: '典藏', headerTitleItalic: '谱目', quote: '岁月失语，唯石能言；\\n人脉流转，唯谱能传。' },
    users: { label: '守藏', soul: '司', headerEyebrow: '卷之三 · 职官', headerTitle: '守藏', headerTitleItalic: '名录', quote: '修谱者，续宗支、识尊卑，\\n功在当代，利在千秋。' },
    logs: { label: '流年', soul: '岁', headerEyebrow: '卷之四 · 纪事', headerTitle: '流年', headerTitleItalic: '纪事', quote: '笔墨之间，见微知著；\\n行止之处，皆有回响。' },
    settings: { soul: '枢' }
  },
  shrine: {
    id: 'shrine',
    name: '传统宗祠',
    logo: { seal: '宗', title: '宗族 · 明堂', subtitle: 'CLAN REGISTRY' },
    footerQuote: '敬宗收族，代代相继',
    dashboard: { label: '明堂', soul: '堂', headerEyebrow: '正庭 · 肃穆', headerTitle: '宗族', headerTitleItalic: '明堂', quote: '祖宗虽远，祭祀不可不诚；\\n子孙虽愚，经书不可不读。' },
    publications: { label: '谱箧', soul: '珍', headerEyebrow: '西厢 · 藏珍', headerTitle: '宗族', headerTitleItalic: '谱箧', quote: '牒谱之作，以奠世系、辨昭穆，\\n敬宗收族也。' },
    users: { label: '执事', soul: '执', headerEyebrow: '东厢 · 司理', headerTitle: '执事', headerTitleItalic: '名录', quote: '敬长尊贤，敦宗睦族；\\n各秉其职，代代相继。' },
    logs: { label: '堂志', soul: '志', headerEyebrow: '回廊 · 留痕', headerTitle: '宗祠', headerTitleItalic: '堂志', quote: '堂前燕去燕又回，\\n阶下阶前印苍苔。' },
    settings: { soul: '理' }
  },
  poetic: {
    id: 'poetic',
    name: '雅致诗意',
    logo: { seal: '源', title: '溯源 · 逆旅', subtitle: 'ETERNAL LINEAGE' },
    footerQuote: '万物逆旅，百代过客',
    dashboard: { label: '溯源', soul: '溯', headerEyebrow: '首篇 · 寻根', headerTitle: '万物', headerTitleItalic: '溯源', quote: '树高千丈，落叶归根；\\n水流万里，溯流思源。' },
    publications: { label: '琅嬛', soul: '玉', headerEyebrow: '次篇 · 拾遗', headerTitle: '琅嬛', headerTitleItalic: '福地', quote: '琅嬛福地，玉轴金薤；\\n片纸只字，皆是云烟。' },
    users: { label: '同道', soul: '契', headerEyebrow: '三篇 · 结契', headerTitle: '同道', headerTitleItalic: '中人', quote: '岂曰无衣，与子同袍；\\n岂曰无谱，与子同抄。' },
    logs: { label: '流年', soul: '光', headerEyebrow: '末章 · 韶华', headerTitle: '岁月', headerTitleItalic: '流年', quote: '万物逆旅，百代过客；\\n浮生若梦，为欢几何。' },
    settings: { soul: '镜' }
  }
}

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
