import { CURRENCY_FRACTION_DIGITS, CURRENCY_PREFIX } from './constants'

export const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatCount = (value) => Number(value || 0).toLocaleString()

export const formatCurrency = (value) =>
  `${CURRENCY_PREFIX}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: CURRENCY_FRACTION_DIGITS,
    maximumFractionDigits: CURRENCY_FRACTION_DIGITS,
  })}`

export const formatCountLabel = (value, singular, plural = `${singular}s`) => {
  const count = Number(value || 0)
  return `${formatCount(count)} ${count === 1 ? singular : plural}`
}

export const parseDateOnly = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

export const formatDaysLapsed = (dateValue, todayStr) => {
  const date = parseDateOnly(dateValue)
  const today = parseDateOnly(todayStr)
  if (!date || !today) return '-'

  const days = Math.max(0, Math.ceil((today - date) / (1000 * 60 * 60 * 24)))
  return `${formatCount(days)} ${days === 1 ? 'day' : 'days'}`
}
