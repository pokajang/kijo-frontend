import { formatCount, formatMoney, getAgeTone, isOpenStatus } from './debtorUtils'

const sumBy = (rows, field) => rows.reduce((sum, row) => sum + Number(row?.[field] || 0), 0)

const getCollectionDays = (row) =>
  row.overdueDays !== null && row.overdueDays !== undefined
    ? Number(row.overdueDays || 0)
    : Number(row.ageDays || 0)

const dateDiffDays = (start, end) => {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null
  return Math.floor((endTime - startTime) / 86400000)
}

const countLabel = (count, noun = 'invoice') =>
  `${formatCount(count)} ${noun}${count === 1 ? '' : 's'}`

const buildOutstandingStats = (rows) => {
  const openRows = rows.filter((row) => isOpenStatus(row.status))
  const overThirtyRows = openRows.filter((row) => getCollectionDays(row) > 30)
  const thirtyOneToSixtyRows = openRows.filter((row) => {
    const collectionDays = getCollectionDays(row)
    return collectionDays >= 31 && collectionDays <= 60
  })
  const sixtyOnePlusRows = openRows.filter((row) => getCollectionDays(row) >= 61)

  return [
    {
      key: 'open-receivables',
      label: 'Open Receivables',
      value: formatMoney(sumBy(openRows, 'outstandingAmount')),
      tone: 'warning',
      size: 'md',
    },
    {
      key: 'over-30',
      label: 'More Than 30 Days',
      value: formatMoney(sumBy(overThirtyRows, 'outstandingAmount')),
      sublabel: countLabel(overThirtyRows.length),
      tone: overThirtyRows.length ? 'danger' : 'secondary',
      size: 'md',
    },
    {
      key: '31-60',
      label: '31-60 Days',
      value: formatMoney(sumBy(thirtyOneToSixtyRows, 'outstandingAmount')),
      sublabel: countLabel(thirtyOneToSixtyRows.length),
      tone: thirtyOneToSixtyRows.length ? 'warning' : 'secondary',
      size: 'md',
    },
    {
      key: '61-plus',
      label: '61+ Days',
      value: formatMoney(sumBy(sixtyOnePlusRows, 'outstandingAmount')),
      sublabel: countLabel(sixtyOnePlusRows.length),
      tone: sixtyOnePlusRows.length ? 'danger' : 'secondary',
      size: 'md',
    },
  ]
}

const buildPartialStats = (rows) => {
  const oldestDays = rows.reduce(
    (oldest, row) => Math.max(oldest, Math.max(0, getCollectionDays(row))),
    0,
  )

  return [
    {
      key: 'partial-records',
      label: 'Partially Paid',
      value: formatCount(rows.length),
      sublabel: countLabel(rows.length, 'record'),
      tone: rows.length ? 'info' : 'secondary',
      size: 'md',
    },
    {
      key: 'partial-collected',
      label: 'Collected So Far',
      value: formatMoney(sumBy(rows, 'paidTotal')),
      tone: 'success',
      size: 'md',
    },
    {
      key: 'partial-outstanding',
      label: 'Still Outstanding',
      value: formatMoney(sumBy(rows, 'outstandingAmount')),
      tone: rows.length ? 'warning' : 'secondary',
      size: 'md',
    },
    {
      key: 'partial-oldest',
      label: 'Oldest Outstanding',
      value: `${oldestDays}d`,
      tone: rows.length ? getAgeTone(oldestDays) : 'secondary',
      size: 'md',
    },
  ]
}

const buildPaidStats = (rows, asOfDate) => {
  const settlementDays = rows
    .map((row) => dateDiffDays(row.invoiceDate, row.lastPaymentDate))
    .filter((days) => days !== null && days >= 0)
  const recentRows = rows.filter((row) => {
    const daysAgo = dateDiffDays(row.lastPaymentDate, asOfDate)
    return daysAgo !== null && daysAgo >= 0 && daysAgo <= 30
  })
  const averageDays = settlementDays.length
    ? Math.round(settlementDays.reduce((sum, days) => sum + days, 0) / settlementDays.length)
    : 0

  return [
    {
      key: 'paid-collected',
      label: 'Total Collected',
      value: formatMoney(sumBy(rows, 'paidTotal')),
      tone: 'success',
      size: 'md',
    },
    {
      key: 'paid-records',
      label: 'Paid Records',
      value: formatCount(rows.length),
      sublabel: countLabel(rows.length, 'record'),
      tone: rows.length ? 'success' : 'secondary',
      size: 'md',
    },
    {
      key: 'paid-recent',
      label: 'Settled Last 30 Days',
      value: formatCount(recentRows.length),
      sublabel: countLabel(recentRows.length, 'record'),
      tone: recentRows.length ? 'info' : 'secondary',
      size: 'md',
    },
    {
      key: 'paid-average-days',
      label: 'Average Time to Settle',
      value: `${averageDays}d`,
      sublabel: settlementDays.length
        ? `${settlementDays.length} dated records`
        : 'No dated records',
      tone: settlementDays.length ? getAgeTone(averageDays) : 'secondary',
      size: 'md',
    },
  ]
}

const buildAllStats = (rows) => [
  {
    key: 'all-billed',
    label: 'Total Billed',
    value: formatMoney(sumBy(rows, 'grandTotal')),
    tone: 'info',
    size: 'md',
  },
  {
    key: 'all-collected',
    label: 'Total Collected',
    value: formatMoney(sumBy(rows, 'paidTotal')),
    tone: 'success',
    size: 'md',
  },
  {
    key: 'all-outstanding',
    label: 'Total Outstanding',
    value: formatMoney(sumBy(rows, 'outstandingAmount')),
    tone: sumBy(rows, 'outstandingAmount') > 0 ? 'warning' : 'secondary',
    size: 'md',
  },
  {
    key: 'all-records',
    label: 'All Records',
    value: formatCount(rows.length),
    sublabel: countLabel(rows.length, 'record'),
    tone: 'secondary',
    size: 'md',
  },
]

const buildCancelledStats = (rows) => [
  {
    key: 'cancelled-value',
    label: 'Cancelled Value',
    value: formatMoney(sumBy(rows, 'grandTotal')),
    tone: rows.length ? 'danger' : 'secondary',
    size: 'md',
  },
  {
    key: 'cancelled-records',
    label: 'Cancelled Records',
    value: formatCount(rows.length),
    sublabel: countLabel(rows.length, 'record'),
    tone: rows.length ? 'danger' : 'secondary',
    size: 'md',
  },
  {
    key: 'cancelled-manual',
    label: 'Manual Entries',
    value: formatCount(rows.filter((row) => row.sourceType === 'manual').length),
    tone: 'secondary',
    size: 'md',
  },
  {
    key: 'cancelled-system',
    label: 'System Invoices',
    value: formatCount(rows.filter((row) => row.sourceType === 'invoice').length),
    tone: 'secondary',
    size: 'md',
  },
]

export const buildDebtorStats = (rows, scope, asOfDate) => {
  if (scope === 'partial') return buildPartialStats(rows)
  if (scope === 'paid') return buildPaidStats(rows, asOfDate)
  if (scope === 'all') return buildAllStats(rows)
  if (scope === 'cancelled') return buildCancelledStats(rows)
  return buildOutstandingStats(rows)
}
