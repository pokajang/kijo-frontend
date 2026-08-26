const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    const parsed = toFiniteNumber(value)
    if (parsed !== null) return parsed
  }
  return 0
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export const formatInvoiceMoney = (value) =>
  `RM ${firstFiniteNumber(value).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const resolveStoredInvoiceTotals = (invoice = {}) => {
  const resolvedInvoice = invoice || {}
  const raw = resolvedInvoice.raw || resolvedInvoice
  const grandTotal = firstFiniteNumber(raw.grand_total, resolvedInvoice.grandTotal)
  const sstAmount = firstFiniteNumber(raw.sst_amount, resolvedInvoice.sstAmount)
  const subtotalBeforeSst = roundMoney(grandTotal - sstAmount)
  const explicitSstPercent = toFiniteNumber(
    raw.sst_percent ?? raw.sst_rate ?? resolvedInvoice.sstPercent,
  )
  const sstPercent =
    explicitSstPercent ??
    (subtotalBeforeSst > 0 ? roundMoney((sstAmount / subtotalBeforeSst) * 100) : 0)

  return {
    subtotalBeforeSst,
    sstAmount,
    sstPercent,
    grandTotal,
  }
}

export const buildStoredInvoiceSummaryRows = (invoice = {}) => {
  const totals = resolveStoredInvoiceTotals(invoice)
  const rows = [
    {
      key: 'subtotal-before-sst',
      label: 'Subtotal (Before SST)',
      value: formatInvoiceMoney(totals.subtotalBeforeSst),
    },
  ]

  if (totals.sstAmount > 0) {
    rows.push({
      key: 'sst',
      label: `${totals.sstPercent.toFixed(2)}% SST`,
      value: formatInvoiceMoney(totals.sstAmount),
    })
  }

  rows.push({
    key: 'grand-total',
    label: 'Grand Total',
    value: formatInvoiceMoney(totals.grandTotal),
    strong: true,
  })

  return rows
}
