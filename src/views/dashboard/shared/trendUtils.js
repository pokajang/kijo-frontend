const parseMonthKey = (monthKey) => {
  if (!monthKey) return null

  const [year, month] = monthKey.split('-').map((value) => parseInt(value, 10))
  if (!year || !month) return null

  return new Date(year, month - 1, 1)
}

const parseDateKey = (dateKey) => {
  if (!dateKey) return new Date()

  const [year, month, day] = dateKey.split('-').map((value) => parseInt(value, 10))
  if (!year || !month || !day) return new Date()

  return new Date(year, month - 1, day)
}

const isEndOfMonth = (date) => {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return date.getDate() === lastDay
}

const isConsecutiveMonth = (previousMonth, latestMonth) => {
  if (!previousMonth || !latestMonth) return false

  return (
    latestMonth.getFullYear() * 12 + latestMonth.getMonth() ===
    previousMonth.getFullYear() * 12 + previousMonth.getMonth() + 1
  )
}

const isLatestMonthComplete = (latestMonth, endDate) => {
  if (!latestMonth) return false

  const effectiveEndDate = parseDateKey(endDate)
  const endMatchesLatestMonth =
    effectiveEndDate.getFullYear() === latestMonth.getFullYear() &&
    effectiveEndDate.getMonth() === latestMonth.getMonth()

  return endMatchesLatestMonth ? isEndOfMonth(effectiveEndDate) : true
}

const getComparisonLabel = (period, latestMonthKey, previousMonthKey, endDate) => {
  if (period === 'custom') return 'vs previous point'

  const latestMonth = parseMonthKey(latestMonthKey)
  const previousMonth = parseMonthKey(previousMonthKey)
  if (!isConsecutiveMonth(previousMonth, latestMonth)) return 'vs previous point'
  if (!isLatestMonthComplete(latestMonth, endDate)) return 'vs previous point'

  return 'MoM'
}

export const getTrendSummary = (points, monthKeys, period, endDate) => {
  const lastIdx = points.length - 1
  const latest = points[lastIdx] || 0

  if (lastIdx < 1) {
    return { latest, comparisonText: '' }
  }

  const prev = points[lastIdx - 1] || 0
  if (prev <= 0) {
    return { latest, comparisonText: 'no prior baseline' }
  }

  const pct = Math.round(((latest - prev) / prev) * 100)
  const comparisonLabel = getComparisonLabel(
    period,
    monthKeys[lastIdx],
    monthKeys[lastIdx - 1],
    endDate,
  )

  return {
    latest,
    pct,
    isUp: latest >= prev,
    comparisonText: `${pct}% ${comparisonLabel}`,
  }
}
