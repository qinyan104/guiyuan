import { computed, type ComputedRef } from 'vue'
import { parseYear } from '../lib/dateUtils'
import type { FamilyUnit, Person, PublicationData } from '../types/family'

export function usePublicationStats(pubData: ComputedRef<PublicationData>) {
  const people = computed<Person[]>(() => Object.values(pubData.value.people ?? {}))
  const totalCount = computed(() => people.value.length)

  // ── 性别与在世统计 ──
  const maleCount = computed(() => people.value.filter(p => p.gender === 'male').length)
  const deceasedCount = computed(() => people.value.filter(p => p.deceased).length)
  const aliveCount = computed(() => totalCount.value - deceasedCount.value)
  const malePercent = computed(() => (totalCount.value ? Math.round((maleCount.value / totalCount.value) * 100) : 0))

  // ── 堂号与修谱信息 ──
  const clanHallInfo = computed(() => {
    const info = pubData.value.info
    if (!info) return null
    return {
      hall: info.hallName?.trim(),
      motto: info.familyMotto?.trim(),
      origin: info.ancestralOrigin?.trim(),
    }
  })

  // ── 世代计算与世代金字塔 ──
  const families = computed<Record<string, FamilyUnit>>(() => pubData.value.families ?? {})
  const generationMap = computed(() => {
    const map = new Map<string, number>()
    const rootId = pubData.value.focusFamilyId
    const rootFamily = rootId ? families.value[rootId] : Object.values(families.value)[0]
    if (!rootFamily) return map

    const queue: Array<{ personId: string; generation: number }> = []
    for (const adultId of rootFamily.adults) {
      if (adultId && !map.has(adultId)) {
        map.set(adultId, 1)
        queue.push({ personId: adultId, generation: 1 })
      }
    }

    let head = 0
    const famList = Object.values(families.value)
    while (head < queue.length) {
      const cur = queue[head++]
      for (const fam of famList) {
        if (!fam.adults.includes(cur.personId)) continue
        for (const sid of fam.adults) {
          if (sid && !map.has(sid)) {
            map.set(sid, cur.generation)
            queue.push({ personId: sid, generation: cur.generation })
          }
        }
        for (const cid of fam.children) {
          if (cid && !map.has(cid)) {
            map.set(cid, cur.generation + 1)
            queue.push({ personId: cid, generation: cur.generation + 1 })
          }
        }
      }
    }
    return map
  })

  const generationDistribution = computed(() => {
    const counts = new Map<number, number>()
    for (const p of people.value) {
      const g = generationMap.value.get(p.id) ?? 0
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => a[0] - b[0])
  })

  const maxGenCount = computed(() => {
    let m = 1
    for (const [, c] of generationDistribution.value) {
      if (c > m) m = c
    }
    return m
  })

  const generationCount = computed(() => {
    const gens = generationDistribution.value.map(([g]) => g).filter(g => g > 0)
    return gens.length ? Math.max(...gens) : 0
  })

  const peakGeneration = computed(() => {
    let maxGen = 0
    let maxC = 0
    for (const [g, c] of generationDistribution.value) {
      if (g > 0 && c > maxC) {
        maxC = c
        maxGen = g
      }
    }
    return maxGen > 0 ? [maxGen, maxC] : null
  })

  const generationDetails = computed(() => {
    return generationDistribution.value.map(([g, c]) => {
      const pInGen = people.value.filter(p => (generationMap.value.get(p.id) ?? 0) === g)
      const m = pInGen.filter(p => p.gender === 'male').length
      const f = pInGen.filter(p => p.gender === 'female').length
      return { generation: g, count: c, male: m, female: f }
    })
  })

  // ── 寿数与历史年代统计 ──
  const lifespans = computed<number[]>(() => {
    const list: number[] = []
    for (const p of people.value) {
      const by = parseYear(p.birth)
      const dy = parseYear(p.death)
      if (by !== null && dy !== null && dy >= by) {
        const age = dy - by
        if (age >= 0 && age <= 120) list.push(age)
      }
    }
    return list
  })

  const avgLifespan = computed(() => {
    if (lifespans.value.length === 0) return null
    const sum = lifespans.value.reduce((acc, v) => acc + v, 0)
    return Math.round(sum / lifespans.value.length)
  })

  const oldestPerson = computed(() => {
    let maxAge = -1
    let target: { person: Person; years: number; birth: string; death: string } | null = null
    for (const p of people.value) {
      const by = parseYear(p.birth)
      const dy = parseYear(p.death)
      if (by !== null && dy !== null && dy >= by) {
        const age = dy - by
        if (age > maxAge) {
          maxAge = age
          target = { person: p, years: age, birth: p.birth || `${by}年`, death: p.death || `${dy}年` }
        }
      }
    }
    return target
      ? {
          id: target.person.id,
          name: target.person.name,
          years: target.years,
          birth: target.birth,
          death: target.death,
        }
      : null
  })

  const lifespanBuckets = computed(() => {
    const buckets = [
      { label: '30岁以下', min: 0, max: 29, count: 0 },
      { label: '30-49岁', min: 30, max: 49, count: 0 },
      { label: '50-69岁', min: 50, max: 69, count: 0 },
      { label: '70-79岁 (古稀)', min: 70, max: 79, count: 0 },
      { label: '80岁以上 (耄耋)', min: 80, max: 150, count: 0 },
    ]
    for (const age of lifespans.value) {
      for (const b of buckets) {
        if (age >= b.min && age <= b.max) {
          b.count++
          break
        }
      }
    }
    return buckets.map(b => [b.label, b.count] as [string, number])
  })

  const maxBucket = computed(() => {
    let m = 1
    for (const [, c] of lifespanBuckets.value) {
      if (c > m) m = c
    }
    return m
  })

  // ── 历代跨度 ──
  const timelineSpan = computed(() => {
    let earliest = Infinity
    let latest = -Infinity
    for (const p of people.value) {
      const by = parseYear(p.birth)
      const dy = parseYear(p.death)
      if (by !== null) {
        if (by < earliest) earliest = by
        if (by > latest) latest = by
      }
      if (dy !== null) {
        if (dy < earliest) earliest = dy
        if (dy > latest) latest = dy
      }
    }
    if (earliest === Infinity || latest === -Infinity) return null
    return latest - earliest
  })

  // ── 昭穆字派高频字 (字辈分析) ──
  const nameCharDist = computed(() => {
    const counts = new Map<string, number>()
    for (const p of people.value) {
      const raw = (p.name || '').trim()
      if (raw.length < 2) continue
      const givenName = raw.slice(1)
      for (const ch of givenName) {
        if (/^[\u4e00-\u9fa5]$/.test(ch)) {
          counts.set(ch, (counts.get(ch) ?? 0) + 1)
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, c]) => c >= 2)
      .slice(0, 12)
  })

  // ── 姓氏与主要姻亲 ──
  const surnameDist = computed(() => {
    const counts = new Map<string, number>()
    for (const p of people.value) {
      const n = (p.name || '').trim()
      if (n.length >= 1) {
        const s = n.charAt(0)
        counts.set(s, (counts.get(s) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  })

  const maxSurname = computed(() => {
    let m = 1
    for (const [, c] of surnameDist.value) {
      if (c > m) m = c
    }
    return m
  })

  // ── 叙述性摘要 ──
  const narrativeSummary = computed(() => {
    if (totalCount.value === 0) return ''
    const parts: string[] = []
    parts.push(`本谱共载族人先祖 ${totalCount.value} 位`)
    if (generationCount.value > 0) parts.push(`历传 ${generationCount.value} 世`)
    if (timelineSpan.value !== null) parts.push(`跨越 ${timelineSpan.value} 年时空脉络`)
    if (peakGeneration.value) parts.push(`于第 ${peakGeneration.value[0]} 世迎繁衍鼎盛 (${peakGeneration.value[1]}人)`)
    if (avgLifespan.value !== null) parts.push(`有据族人平均享寿 ${avgLifespan.value} 岁`)
    return `${parts.join('，')}。`
  })

  return {
    totalCount,
    maleCount,
    deceasedCount,
    aliveCount,
    malePercent,
    clanHallInfo,
    generationDistribution,
    maxGenCount,
    generationCount,
    peakGeneration,
    generationDetails,
    lifespans,
    avgLifespan,
    oldestPerson,
    lifespanBuckets,
    maxBucket,
    timelineSpan,
    nameCharDist,
    surnameDist,
    maxSurname,
    narrativeSummary,
  }
}
