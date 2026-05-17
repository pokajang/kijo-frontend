const formatDisplayDate = (date) => {
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatDateRangeLabel = (startDate, endDate) => {
  const hasStartDate = Boolean(startDate)
  const hasEndDate = Boolean(endDate)
  const startLabel = hasStartDate ? formatDisplayDate(startDate) : ''
  const endLabel = hasEndDate ? formatDisplayDate(endDate) : ''

  if (startLabel && endLabel) {
    return `${startLabel} to ${endLabel}`
  }

  if (startLabel) return `From ${startLabel}`
  if (endLabel) return `Up to ${endLabel}`

  if (hasStartDate || hasEndDate) {
    return 'Invalid date range'
  }

  return 'All time'
}
