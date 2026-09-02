export const hasValue = (value) => value !== null && value !== undefined && value !== ''

export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const toBoolean = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  }
  return false
}

export const formatMoney = (value) => formatDisplayMoney(toFiniteNumber(value))

export const formatNumber = (value) =>
  formatDisplayNumber(toFiniteNumber(value), { maximumFractionDigits: 2 })

export const formatPercentage = (value) => `${formatNumber(value)}%`

export const formatAddress = (client = {}) => {
  const locality = [client.zip, client.city].filter(Boolean).join(' ')
  return [client.address, locality, client.state].filter(Boolean).join(', ') || 'Not provided'
}

export const getProposalLanguageLabel = (value) => {
  if (value === 'ms-MY') return 'Bahasa Melayu'
  if (value === 'en') return 'English'
  return value || 'Not provided'
}
import {
  formatMoney as formatDisplayMoney,
  formatNumber as formatDisplayNumber,
} from '../../../../utils/formatters/numberFormatters'
