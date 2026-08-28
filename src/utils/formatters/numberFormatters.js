export const DEFAULT_NUMBER_LOCALE = 'en-MY'

export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const formatNumber = (
  value,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    fallback = '0',
    locale = DEFAULT_NUMBER_LOCALE,
  } = {},
) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback

  return number.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  })
}

export const formatMoney = (
  value,
  {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = 'RM 0.00',
    locale = DEFAULT_NUMBER_LOCALE,
  } = {},
) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback

  return `RM ${formatNumber(number, {
    minimumFractionDigits,
    maximumFractionDigits,
    locale,
  })}`
}

export const formatCount = (value, { fallback = '0', locale = DEFAULT_NUMBER_LOCALE } = {}) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback

  return Math.round(number).toLocaleString(locale, {
    maximumFractionDigits: 0,
  })
}
