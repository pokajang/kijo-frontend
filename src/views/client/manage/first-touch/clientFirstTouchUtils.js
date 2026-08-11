const statusLabels = {
  current: 'Current first touch',
  contested: 'Current - contested',
  competing: 'Competing claim',
  unresolved: 'Unresolved',
  rejected: 'Rejected',
  superseded: 'Superseded',
  missing: 'No evidence',
}

export const getFirstTouchStatus = (record) => {
  if (record?.firstTouch?.status) return record.firstTouch.status
  if (record?.conflict?.resolution === 'reject_both') return 'unresolved'
  return 'missing'
}

export const getFirstTouchStatusLabel = (status) => statusLabels[status] || 'Not documented'

export const getFirstTouchStatusTone = (status) => {
  if (status === 'current') return 'success'
  if (status === 'contested' || status === 'competing') return 'warning'
  if (status === 'rejected') return 'danger'
  if (status === 'superseded') return 'secondary'
  return 'secondary'
}

export const hasFirstTouchEvidence = (record) => {
  const claims = record?.claims?.length
    ? record.claims
    : record?.firstTouch
      ? [record.firstTouch]
      : []

  return claims.some((claim) => Number(claim.proofCount || 0) > 0 || Boolean(claim.proofs?.length))
}

export const getFirstTouchSourceLabel = (firstTouch) => {
  if (!firstTouch) return 'Unknown'
  return [firstTouch.channel, firstTouch.method].filter(Boolean).join(' · ') || 'Unknown'
}

export const getFirstTouchPersonName = (firstTouch) =>
  firstTouch?.referrerName || firstTouch?.amioshContact || ''

export const getFirstTouchPersonCode = (firstTouch) =>
  firstTouch?.referrerCode || firstTouch?.amioshContactCode || ''

export const getFirstTouchEmploymentStatusLabel = (firstTouch) => {
  if (!firstTouch) return ''
  if (
    firstTouch.referrerName ||
    firstTouch.employmentContext === 'former' ||
    firstTouch.employmentBoundary === 'after_departure'
  ) {
    return 'After leaving Amiosh'
  }
  if (
    firstTouch.amioshContactStaffId ||
    firstTouch.employmentContext === 'in_service' ||
    firstTouch.employmentBoundary === 'before_departure'
  ) {
    return 'While in service'
  }
  return ''
}

export const formatFirstTouchDate = (value) => {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const formatContributionMoney = (value) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export const formatCompactContributionMoney = (value) => {
  const amount = Number(value || 0)
  if (Math.abs(amount) >= 1_000_000) return `RM ${(amount / 1_000_000).toFixed(2)}M`
  if (Math.abs(amount) >= 1_000) return `RM ${(amount / 1_000).toFixed(0)}K`
  return `RM ${amount.toLocaleString('en-MY')}`
}

export const filterFirstTouchRecords = (records, filters) => {
  const term = String(filters?.search || '')
    .trim()
    .toLowerCase()
  return records.filter((record) => {
    const firstTouch = record.firstTouch
    const status = getFirstTouchStatus(record)
    const searchable = [
      record.companyName,
      firstTouch?.sourceGroup,
      firstTouch?.channel,
      firstTouch?.method,
      firstTouch?.clientContact,
      getFirstTouchPersonName(firstTouch),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (term && !searchable.includes(term)) return false
    if (filters?.status && filters.status !== status) return false
    if (filters?.sourceGroup && filters.sourceGroup !== firstTouch?.sourceGroup) return false
    if (filters?.evidence === 'documented' && !hasFirstTouchEvidence(record)) return false
    if (filters?.evidence === 'missing' && hasFirstTouchEvidence(record)) return false
    return true
  })
}

export const groupFirstTouchRecordsBySource = (records) => {
  const groups = new Map()

  records.forEach((record) => {
    const firstTouch = record.firstTouch
    if (!firstTouch || getFirstTouchStatus(record) !== 'current') return
    const group = firstTouch.sourceGroup
    const contribution = record.contribution || {}
    const current = groups.get(group) || {
      sourceGroup: group,
      clientCount: 0,
      awarded: 0,
      invoiced: 0,
      collected: 0,
      grossProfit: 0,
    }

    current.clientCount += 1
    current.awarded += Number(contribution.awarded || 0)
    current.invoiced += Number(contribution.invoiced || 0)
    current.collected += Number(contribution.collected || 0)
    current.grossProfit += Number(contribution.grossProfit || 0)
    groups.set(group, current)
  })

  return Array.from(groups.values()).sort((a, b) => b.collected - a.collected)
}

export const getProjectStatusLabel = (status) => {
  if (status === 'paid') return 'Paid'
  if (status === 'partially_paid') return 'Partially paid'
  if (status === 'active') return 'Active'
  return status || 'Unknown'
}

export const getProjectStatusTone = (status) => {
  if (status === 'paid') return 'success'
  if (status === 'partially_paid') return 'warning'
  if (status === 'active') return 'info'
  return 'secondary'
}
