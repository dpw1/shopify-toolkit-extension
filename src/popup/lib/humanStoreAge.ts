/** Calendar difference from `from` to `to` (inclusive, stable for “age” copy). */
function diffCalendar(from: Date, to: Date): { years: number; months: number; days: number } {
  let y = to.getFullYear() - from.getFullYear()
  let m = to.getMonth() - from.getMonth()
  let d = to.getDate() - from.getDate()
  if (d < 0) {
    m -= 1
    d += new Date(to.getFullYear(), to.getMonth(), 0).getDate()
  }
  if (m < 0) {
    y -= 1
    m += 12
  }
  return { years: Math.max(0, y), months: Math.max(0, m), days: Math.max(0, d) }
}

function part(n: number, singular: string, plural: string): string {
  if (n <= 0) return ''
  return `${n} ${n === 1 ? singular : plural}`
}

/**
 * How long the store has been selling, from first `published_at` to now, e.g.
 * `3 years, 2 months, 5 days`.
 */
export function formatStoreAgeSummary(firstPublished: Date, now: Date = new Date()): string {
  if (firstPublished > now) return '—'
  const { years, months, days } = diffCalendar(firstPublished, now)
  const parts: string[] = []
  const py = part(years, 'year', 'years')
  const pm = part(months, 'month', 'months')
  const pd = part(days, 'day', 'days')
  if (py) parts.push(py)
  if (pm) parts.push(pm)
  if (pd) parts.push(pd)
  if (parts.length === 0) return 'Less than 1 day'
  return parts.join(', ')
}

/** mm/dd/yyyy, h:mm am/pm (en-US). */
export function formatFirstProductPublishedLine(d: Date): string {
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
