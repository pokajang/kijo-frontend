// utils.js

export const filterActivities = (
  activities,
  searchTerm,
  userFilter,
  periodFilter,
  customStartDate,
  customEndDate,
  monthFilter, // 👈 NEW
) => {
  const q = searchTerm.toLowerCase()
  const now = new Date()

  let dateThreshold = null
  let customStart = customStartDate ? new Date(customStartDate) : null
  let customEnd = customEndDate ? new Date(customEndDate) : null

  // Handle predefined periods
  switch (periodFilter) {
    case '1w':
      dateThreshold = new Date(now.setDate(now.getDate() - 7))
      break
    case '1m':
      dateThreshold = new Date(now.setMonth(now.getMonth() - 1))
      break
    case '1y':
      dateThreshold = new Date(now.setFullYear(now.getFullYear() - 1))
      break
    case 'custom':
      // customStart/customEnd handled below
      break
    case 'by_month':
      // handled below
      break
    default:
      dateThreshold = null
  }

  return activities.filter((a) => {
    const entryDate = new Date(a.date)

    const matchesSearch =
      a.user_code?.toLowerCase().includes(q) || a.details?.toLowerCase().includes(q)

    const matchesUser =
      userFilter === 'all' || a.user_code?.toLowerCase() === userFilter.toLowerCase()

    const matchesDate =
      periodFilter === 'custom'
        ? (!customStart || entryDate >= customStart) && (!customEnd || entryDate <= customEnd)
        : periodFilter === 'by_month'
          ? monthFilter
            ? entryDate.getFullYear() === Number(monthFilter.split('-')[0]) &&
              entryDate.getMonth() === Number(monthFilter.split('-')[1]) - 1
            : true
          : !dateThreshold || entryDate >= dateThreshold

    return matchesSearch && matchesUser && matchesDate
  })
}

export const sortActivities = (activities, sortColumn, sortDirection) => {
  return [...activities].sort((a, b) => {
    const valA = a[sortColumn]?.toLowerCase?.() || a[sortColumn]
    const valB = b[sortColumn]?.toLowerCase?.() || b[sortColumn]

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
}
