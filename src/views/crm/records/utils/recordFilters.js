const toDateOnly = (v) => {
  if (!v) return ''
  const s = String(v)
  if (s.includes('T')) return s.split('T')[0]
  if (s.includes(' ')) return s.split(' ')[0]
  return s
}

export const getDateOnly = toDateOnly

export const getIssuerCodeOptions = (records = []) => {
  const uniqueCodes = new Set()

  records.forEach((record) => {
    const code = String(record?.createdByCode || '').trim()
    if (!code || code === '-') return
    uniqueCodes.add(code)
  })

  return Array.from(uniqueCodes).sort((a, b) => a.localeCompare(b))
}

export const getYearOptions = (records = [], currentYear) => {
  const uniqueYears = new Set([String(currentYear)])

  records.forEach((record) => {
    const createdDate = toDateOnly(record?.dateCreated)
    if (!createdDate) return

    const y = createdDate.slice(0, 4)
    if (/^\d{4}$/.test(y)) uniqueYears.add(y)
  })

  return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a))
}

const getFollowUpsText = (followUps = []) =>
  followUps.map((fu) => `${fu?.followUpDate || ''} ${fu?.remarks || ''}`.trim()).join(' ')

const getLatestFollowUpDate = (followUps = []) =>
  followUps.reduce((latest, fu) => {
    const raw = String(fu?.followUpDate || '').trim()
    if (!raw) return latest

    const d = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(d.getTime())) return latest
    if (!latest || d > latest) return d
    return latest
  }, null)

const inFollowUpRecencyWindow = (followUps, recencyDaysRaw) => {
  const recencyDays = Number(recencyDaysRaw)
  if (Number.isNaN(recencyDays) || recencyDays <= 0) return false

  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - recencyDays + 1)

  const latestFollowUpDate = getLatestFollowUpDate(followUps)
  return Boolean(latestFollowUpDate && latestFollowUpDate >= cutoff)
}

export const getQuotationAgeDays = (dateRaw) => {
  const createdDate = toDateOnly(dateRaw)
  if (!createdDate) return null

  const created = new Date(`${createdDate}T00:00:00`)
  if (Number.isNaN(created.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - created.getTime()
  if (diffMs < 0) return 0
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const matchesQuotationAgeFilter = (ageDays, quotationAge) => {
  if (quotationAge === 'all') return true
  if (ageDays == null) return false

  if (quotationAge === '14-30') return ageDays >= 14 && ageDays <= 30
  if (quotationAge === '31-60') return ageDays >= 31 && ageDays <= 60
  if (quotationAge === 'gt60') return ageDays > 60

  return true
}

const matchesPeriodRangeFilter = (dateValue, periodRange) => {
  if (!periodRange || periodRange.preset === 'all') return true

  const dateOnly = toDateOnly(dateValue)
  if (!dateOnly) return false

  const startDate = toDateOnly(periodRange.startDate)
  const endDate = toDateOnly(periodRange.endDate)

  if (startDate && dateOnly < startDate) return false
  if (endDate && dateOnly > endDate) return false

  return true
}

const defaultGetAmount = (record) => Number(record?.amount ?? record?.grandTotal ?? 0)

export const applyRecordFilters = ({
  records = [],
  filters,
  getSearchText,
  getAmount = defaultGetAmount,
}) => {
  const q = (filters?.searchTerm || '').trim().toLowerCase()
  const parsedMin = filters?.minAmount === '' ? null : Number(filters?.minAmount)
  const parsedMax = filters?.maxAmount === '' ? null : Number(filters?.maxAmount)

  return records.filter((record) => {
    const followUps = Array.isArray(record?.followUps) ? record.followUps : []

    const searchText = [
      record?.quotationId,
      record?.clientDetails?.companyName,
      getSearchText?.(record) || '',
      record?.status,
      record?.statusRemarks,
      record?.createdByName,
      record?.createdByCode,
      getFollowUpsText(followUps),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (q && !searchText.includes(q)) return false

    const createdDate = toDateOnly(record?.dateCreated)
    if (!createdDate) return false
    if (!matchesPeriodRangeFilter(createdDate, filters?.periodRange)) return false
    const createdYear = createdDate.slice(0, 4)
    if (filters?.yearFilter !== 'all' && createdYear !== filters?.yearFilter) return false
    if (
      !matchesQuotationAgeFilter(getQuotationAgeDays(createdDate), filters?.quotationAge || 'all')
    ) {
      return false
    }

    if (filters?.statusFilter !== 'all' && record?.status !== filters?.statusFilter) return false

    const hasFollowUp = followUps.length > 0
    if (filters?.followUpFilter === 'yes' && !hasFollowUp) return false
    if (filters?.followUpFilter === 'no' && hasFollowUp) return false

    if (
      filters?.followUpRecency !== 'all' &&
      !inFollowUpRecencyWindow(followUps, filters?.followUpRecency)
    ) {
      return false
    }

    const issuerCode = String(record?.createdByCode || '').trim()
    if (filters?.createdByFilter !== 'all' && issuerCode !== filters?.createdByFilter) return false

    const amount = Number(getAmount(record) ?? 0)
    if (parsedMin != null && !Number.isNaN(parsedMin) && amount < parsedMin) return false
    if (parsedMax != null && !Number.isNaN(parsedMax) && amount > parsedMax) return false

    return true
  })
}
