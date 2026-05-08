export function parseYear(s?: string): number | null {
  if (!s) return null
  const m = s.match(/\d{3,4}/)
  return m ? parseInt(m[0]) : null
}

export function parseExactDate(s?: string): number {
  if (!s) return 0
  const yearMatch = s.match(/(\d{3,4})/)
  if (!yearMatch) return 0

  const year = parseInt(yearMatch[0])
  let month = 0
  let day = 0

  const afterYear = s.substring(yearMatch.index! + yearMatch[0].length)
  const monthMatch = afterYear.match(/[年\-\/\. ]\s*(\d{1,2})/)
  if (monthMatch) {
    const m = parseInt(monthMatch[1])
    if (m >= 1 && m <= 12) {
      month = m
      const afterMonth = afterYear.substring(monthMatch.index! + monthMatch[0].length)
      const dayMatch = afterMonth.match(/[月\-\/\. ]\s*(\d{1,2})/)
      if (dayMatch) {
        const d = parseInt(dayMatch[1])
        if (d >= 1 && d <= 31) {
          day = d
        }
      }
    }
  }
  return year + (month / 100) + (day / 10000)
}
