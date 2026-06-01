const formatDayMonth = (date) =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

export const formatStatsScopeLabel = (scopeLabel) => {
  const match = String(scopeLabel || '').match(/^YTD\s+(\d{4})$/i)
  if (!match) return scopeLabel

  const year = Number(match[1])
  const today = new Date()
  const endLabel =
    today.getFullYear() === year ? `${formatDayMonth(today)} ${year}` : `31 Dec ${year}`

  return `1 Jan - ${endLabel}`
}

export default formatStatsScopeLabel
