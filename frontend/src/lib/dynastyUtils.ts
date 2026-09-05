/**
 * Chinese Dynasties and Sexagenary Cycle (干支纪年) Utilities
 */

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

const CHINESE_DIGITS = ['零', '元', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function toRegnalYear(num: number): string {
  if (num === 1) return '元'
  if (num <= 10) return CHINESE_DIGITS[num]
  if (num < 20) return `十${CHINESE_DIGITS[num - 10] === '零' ? '' : CHINESE_DIGITS[num - 10]}`
  const tens = Math.floor(num / 10)
  const ones = num % 10
  return `${CHINESE_DIGITS[tens]}十${ones ? CHINESE_DIGITS[ones] : ''}`
}

export interface EraDefinition {
  dynasty: string
  name: string
  startYear: number
  endYear: number
}

const REGNAL_ERAS: EraDefinition[] = [
  // ── 唐代重要年号 ──
  { dynasty: '唐代', name: '贞观', startYear: 627, endYear: 649 },
  { dynasty: '唐代', name: '显庆', startYear: 656, endYear: 661 },
  { dynasty: '唐代', name: '开元', startYear: 713, endYear: 741 },
  { dynasty: '唐代', name: '天宝', startYear: 742, endYear: 756 },
  { dynasty: '唐代', name: '大历', startYear: 766, endYear: 779 },
  { dynasty: '唐代', name: '贞元', startYear: 785, endYear: 805 },
  { dynasty: '唐代', name: '元和', startYear: 806, endYear: 820 },
  { dynasty: '唐代', name: '会昌', startYear: 841, endYear: 846 },
  { dynasty: '唐代', name: '大中', startYear: 847, endYear: 860 },

  // ── 北宋 ──
  { dynasty: '北宋', name: '建隆', startYear: 960, endYear: 963 },
  { dynasty: '北宋', name: '开宝', startYear: 968, endYear: 976 },
  { dynasty: '北宋', name: '太平兴国', startYear: 976, endYear: 984 },
  { dynasty: '北宋', name: '淳化', startYear: 990, endYear: 994 },
  { dynasty: '北宋', name: '咸平', startYear: 998, endYear: 1003 },
  { dynasty: '北宋', name: '大中祥符', startYear: 1008, endYear: 1016 },
  { dynasty: '北宋', name: '天圣', startYear: 1023, endYear: 1032 },
  { dynasty: '北宋', name: '景祐', startYear: 1034, endYear: 1038 },
  { dynasty: '北宋', name: '庆历', startYear: 1041, endYear: 1048 },
  { dynasty: '北宋', name: '皇祐', startYear: 1049, endYear: 1054 },
  { dynasty: '北宋', name: '嘉祐', startYear: 1056, endYear: 1063 },
  { dynasty: '北宋', name: '治平', startYear: 1064, endYear: 1067 },
  { dynasty: '北宋', name: '熙宁', startYear: 1068, endYear: 1077 },
  { dynasty: '北宋', name: '元丰', startYear: 1078, endYear: 1085 },
  { dynasty: '北宋', name: '元祐', startYear: 1086, endYear: 1094 },
  { dynasty: '北宋', name: '绍圣', startYear: 1094, endYear: 1098 },
  { dynasty: '北宋', name: '崇宁', startYear: 1102, endYear: 1106 },
  { dynasty: '北宋', name: '大观', startYear: 1107, endYear: 1110 },
  { dynasty: '北宋', name: '政和', startYear: 1111, endYear: 1118 },
  { dynasty: '北宋', name: '宣和', startYear: 1119, endYear: 1125 },
  { dynasty: '北宋', name: '靖康', startYear: 1126, endYear: 1127 },

  // ── 南宋 ──
  { dynasty: '南宋', name: '建炎', startYear: 1127, endYear: 1130 },
  { dynasty: '南宋', name: '绍兴', startYear: 1131, endYear: 1162 },
  { dynasty: '南宋', name: '隆兴', startYear: 1163, endYear: 1164 },
  { dynasty: '南宋', name: '乾道', startYear: 1165, endYear: 1173 },
  { dynasty: '南宋', name: '淳熙', startYear: 1174, endYear: 1189 },
  { dynasty: '南宋', name: '绍熙', startYear: 1190, endYear: 1194 },
  { dynasty: '南宋', name: '庆元', startYear: 1195, endYear: 1200 },
  { dynasty: '南宋', name: '嘉泰', startYear: 1201, endYear: 1204 },
  { dynasty: '南宋', name: '开禧', startYear: 1205, endYear: 1207 },
  { dynasty: '南宋', name: '嘉定', startYear: 1208, endYear: 1224 },
  { dynasty: '南宋', name: '端平', startYear: 1234, endYear: 1236 },
  { dynasty: '南宋', name: '淳祐', startYear: 1241, endYear: 1252 },
  { dynasty: '南宋', name: '咸淳', startYear: 1265, endYear: 1274 },

  // ── 元代 ──
  { dynasty: '元代', name: '中统', startYear: 1260, endYear: 1264 },
  { dynasty: '元代', name: '至元', startYear: 1264, endYear: 1294 },
  { dynasty: '元代', name: '大德', startYear: 1297, endYear: 1307 },
  { dynasty: '元代', name: '至大', startYear: 1308, endYear: 1311 },
  { dynasty: '元代', name: '延祐', startYear: 1314, endYear: 1320 },
  { dynasty: '元代', name: '泰定', startYear: 1324, endYear: 1328 },
  { dynasty: '元代', name: '至正', startYear: 1341, endYear: 1368 },

  // ── 明代 ──
  { dynasty: '明代', name: '洪武', startYear: 1368, endYear: 1398 },
  { dynasty: '明代', name: '建文', startYear: 1399, endYear: 1402 },
  { dynasty: '明代', name: '永乐', startYear: 1403, endYear: 1424 },
  { dynasty: '明代', name: '洪熙', startYear: 1425, endYear: 1425 },
  { dynasty: '明代', name: '宣德', startYear: 1426, endYear: 1435 },
  { dynasty: '明代', name: '正统', startYear: 1436, endYear: 1449 },
  { dynasty: '明代', name: '景泰', startYear: 1450, endYear: 1456 },
  { dynasty: '明代', name: '天顺', startYear: 1457, endYear: 1464 },
  { dynasty: '明代', name: '成化', startYear: 1465, endYear: 1487 },
  { dynasty: '明代', name: '弘治', startYear: 1488, endYear: 1505 },
  { dynasty: '明代', name: '正德', startYear: 1506, endYear: 1521 },
  { dynasty: '明代', name: '嘉靖', startYear: 1522, endYear: 1566 },
  { dynasty: '明代', name: '隆庆', startYear: 1567, endYear: 1572 },
  { dynasty: '明代', name: '万历', startYear: 1573, endYear: 1620 },
  { dynasty: '明代', name: '泰昌', startYear: 1620, endYear: 1620 },
  { dynasty: '明代', name: '天启', startYear: 1621, endYear: 1627 },
  { dynasty: '明代', name: '崇祯', startYear: 1628, endYear: 1644 },

  // ── 清代 ──
  { dynasty: '清代', name: '顺治', startYear: 1644, endYear: 1661 },
  { dynasty: '清代', name: '康熙', startYear: 1662, endYear: 1722 },
  { dynasty: '清代', name: '雍正', startYear: 1723, endYear: 1735 },
  { dynasty: '清代', name: '乾隆', startYear: 1736, endYear: 1795 },
  { dynasty: '清代', name: '嘉庆', startYear: 1796, endYear: 1820 },
  { dynasty: '清代', name: '道光', startYear: 1821, endYear: 1850 },
  { dynasty: '清代', name: '咸丰', startYear: 1851, endYear: 1861 },
  { dynasty: '清代', name: '同治', startYear: 1862, endYear: 1874 },
  { dynasty: '清代', name: '光绪', startYear: 1875, endYear: 1908 },
  { dynasty: '清代', name: '宣统', startYear: 1909, endYear: 1911 },

  // ── 民国 ──
  { dynasty: '民国', name: '民国', startYear: 1912, endYear: 1949 },
]

export interface HistoricalDateInfo {
  year: number
  dynasty: string
  eraName?: string
  reign?: string
  regnalYear?: string
  ganzhi: string
  zodiac: string
  fullLabel: string
  shortLabel: string
}

/**
 * Calculate Sexagenary Cycle (干支) for a given CE year
 */
export function getGanzhi(year: number): { ganzhi: string; zodiac: string } {
  const offset = year - 4
  const stemIndex = ((offset % 10) + 10) % 10
  const branchIndex = ((offset % 12) + 12) % 12
  const ganzhi = `${HEAVENLY_STEMS[stemIndex]}${EARTHLY_BRANCHES[branchIndex]}`
  const zodiac = ZODIAC_ANIMALS[branchIndex]
  return { ganzhi, zodiac }
}

/**
 * Get comprehensive Chinese historical era and dynasty information for any CE year
 */
export function getHistoricalEra(year: number): HistoricalDateInfo {
  const { ganzhi, zodiac } = getGanzhi(year)

  // 1. Check detailed regnal eras
  for (const era of REGNAL_ERAS) {
    if (year >= era.startYear && year <= era.endYear) {
      const regnalNumber = year - era.startYear + 1
      const regnalYear = `${toRegnalYear(regnalNumber)}年`
      const shortLabel = era.dynasty === '民国' ? `民国${regnalYear}` : `${era.dynasty}${era.name}${regnalYear}`
      const fullLabel = `${shortLabel} (${ganzhi}${zodiac}年)`
      return {
        year,
        dynasty: era.dynasty,
        eraName: era.name,
        reign: era.name,
        regnalYear,
        ganzhi,
        zodiac,
        fullLabel,
        shortLabel,
      }
    }
  }

  // 2. Fallbacks for broader historical periods
  let dynasty = '公元纪年'
  if (year >= 1949) dynasty = '当代'
  else if (year >= 1644) dynasty = '清代'
  else if (year >= 1368) dynasty = '明代'
  else if (year >= 1271) dynasty = '元代'
  else if (year >= 1127) dynasty = '南宋'
  else if (year >= 960) dynasty = '北宋'
  else if (year >= 907) dynasty = '五代十国'
  else if (year >= 618) dynasty = '唐代'
  else if (year >= 581) dynasty = '隋代'
  else if (year >= 420) dynasty = '南北朝'
  else if (year >= 265) dynasty = '晋代'
  else if (year >= 220) dynasty = '三国'
  else if (year >= 25) dynasty = '东汉'
  else if (year >= -202) dynasty = '西汉'
  else if (year >= -221) dynasty = '秦代'
  else if (year < -221) dynasty = '先秦'

  const shortLabel = `${dynasty} · ${year}年`
  const fullLabel = `${dynasty} (${ganzhi}${zodiac}年) · 公元${year}年`

  return {
    year,
    dynasty,
    ganzhi,
    zodiac,
    fullLabel,
    shortLabel,
  }
}
