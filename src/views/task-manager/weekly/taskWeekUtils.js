const parseDateOnly = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

const parseDisplayDate = (value) => {
  const text = String(value || '').trim()
  if (!text) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return parseDateOnly(text)

  const date = new Date(text.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? parseDateOnly(text) : date
}

export const formatDateOnly = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getWeekStart = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : parseDateOnly(value)
  if (!date) return ''

  const weekdayOffset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - weekdayOffset)
  return formatDateOnly(date)
}

export const shiftWeekStart = (weekStart, offset) => {
  const date = parseDateOnly(weekStart)
  if (!date) return getWeekStart()
  date.setDate(date.getDate() + offset * 7)
  return formatDateOnly(date)
}

export const getWeekEnd = (weekStart) => {
  const date = parseDateOnly(weekStart)
  if (!date) return ''
  date.setDate(date.getDate() + 6)
  return formatDateOnly(date)
}

export const formatWeekLabel = (weekStart) => {
  const start = parseDateOnly(weekStart)
  if (!start) return '-'
  const end = parseDateOnly(getWeekEnd(weekStart))
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export const getRecentWeekOptions = (today = new Date(), count = 12) => {
  const currentWeekStart = getWeekStart(today)
  return Array.from({ length: count }, (_, index) => {
    const value = shiftWeekStart(currentWeekStart, -index)
    return { value, label: formatWeekLabel(value) }
  })
}

export const formatDisplayDate = (
  value,
  options = { day: 'numeric', month: 'short', year: 'numeric' },
) => {
  const date = parseDisplayDate(value)
  return date ? new Intl.DateTimeFormat(undefined, options).format(date) : '-'
}
