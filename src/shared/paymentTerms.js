export const SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS = 30

export const normalizePaymentTermsDays = (value, fallback = SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS) => {
  if (value === null || value === undefined || value === '') return fallback
  const days = Number(value)
  if (!Number.isFinite(days)) return fallback
  return Math.max(0, Math.min(365, days))
}

export const getClientPaymentTermsMeta = (client = {}) => {
  const record = client ?? {}
  const raw = Object.prototype.hasOwnProperty.call(record, 'payment_terms_days')
    ? record.payment_terms_days
    : record.paymentTermsDays
  const isClientSpecific = raw !== null && raw !== undefined && raw !== ''
  const days = normalizePaymentTermsDays(raw)

  return {
    days,
    source: isClientSpecific ? 'client' : 'system_default',
    isDefault: !isClientSpecific,
    display: isClientSpecific ? `Client-specific (${days} days)` : `System default (${days} days)`,
    compactDisplay: isClientSpecific ? `Client ${days}d` : `Default ${days}d`,
  }
}

export const getInvoicePaymentTermsSourceLabel = (source, days) => {
  const normalizedDays = normalizePaymentTermsDays(days)
  switch (source) {
    case 'client':
      return `From client profile: ${normalizedDays} days`
    case 'invoice_override':
      return `Overridden for this invoice: ${normalizedDays} days`
    case 'legacy':
      return `Legacy invoice terms: ${normalizedDays} days`
    case 'system_default':
    default:
      return `Using system default: ${normalizedDays} days`
  }
}

export const getPaymentTermsCompactLabel = (source, days) => {
  const normalizedDays = normalizePaymentTermsDays(days)
  switch (source) {
    case 'client':
      return `Client ${normalizedDays}d`
    case 'manual_override':
      return `Manual ${normalizedDays}d`
    case 'invoice_override':
      return `Override ${normalizedDays}d`
    case 'legacy':
      return `Legacy ${normalizedDays}d`
    case 'system_default':
    default:
      return `Default ${normalizedDays}d`
  }
}
