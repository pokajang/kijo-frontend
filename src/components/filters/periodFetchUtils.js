const DATE_ONLY_RE = /^(\d{4})-\d{2}-\d{2}$/

const getDateYear = (value) => {
  const match = String(value || '').match(DATE_ONLY_RE)
  return match ? Number(match[1]) : null
}

export const isAllTimePeriod = (periodRange = {}) => periodRange?.preset === 'all'

export const getPeriodDateParams = (periodRange = {}) => {
  if (!periodRange || isAllTimePeriod(periodRange)) return {}

  return {
    ...(periodRange.startDate ? { start: periodRange.startDate } : {}),
    ...(periodRange.endDate ? { end: periodRange.endDate } : {}),
  }
}

export const getPeriodYears = (periodRange = {}, today = new Date()) => {
  const fallbackYear = today.getFullYear()
  if (!periodRange) return [fallbackYear]
  if (isAllTimePeriod(periodRange)) return []

  const startYear = getDateYear(periodRange.startDate)
  const endYear = getDateYear(periodRange.endDate)

  if (!startYear && !endYear) return [fallbackYear]
  if (startYear && !endYear) return [startYear]
  if (!startYear && endYear) return [endYear]

  const firstYear = Math.min(startYear, endYear)
  const lastYear = Math.max(startYear, endYear)
  const years = []

  for (let year = firstYear; year <= lastYear; year += 1) {
    years.push(year)
  }

  return years
}

export const getYearScopedParamSets = (periodRange = {}, today = new Date()) => {
  if (isAllTimePeriod(periodRange)) return [{}]

  return getPeriodYears(periodRange, today).map((year) => ({ year }))
}

export const getActivityPeriodParams = (periodRange = {}) => {
  if (!periodRange || isAllTimePeriod(periodRange)) {
    return { periodFilter: 'all' }
  }

  return {
    periodFilter: 'custom',
    ...(periodRange.startDate ? { customStartDate: periodRange.startDate } : {}),
    ...(periodRange.endDate ? { customEndDate: periodRange.endDate } : {}),
  }
}

export const mergeUniqueRecordsById = (records = [], keys = ['id']) => {
  const seen = new Set()
  const merged = []

  records.forEach((record, index) => {
    const keyValue = keys.map((key) => record?.[key]).find((value) => value != null && value !== '')
    const uniqueKey = keyValue == null ? `index:${index}` : String(keyValue)

    if (seen.has(uniqueKey)) return
    seen.add(uniqueKey)
    merged.push(record)
  })

  return merged
}
