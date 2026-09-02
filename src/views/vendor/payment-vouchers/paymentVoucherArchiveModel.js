export const getVoucherDocumentState = (record = {}) => {
  if (record.document_state === 'void' || record.voucher_status === 'Void') return 'void'
  if (record.document_state === 'paid' && record.paid_pdf_url) return 'paid'
  return 'approved'
}

export const getVoucherStatusPresentation = (record = {}) => {
  const documentState = getVoucherDocumentState(record)
  if (documentState === 'void') return { label: 'Voided', tone: 'danger' }
  if (record.payment_status === 'Paid') return { label: 'Paid', tone: 'success' }
  if (record.payment_status === 'Partially Paid') return { label: 'Partially paid', tone: 'info' }
  return { label: 'Awaiting payment', tone: 'warning' }
}

export const getVoucherDocumentUrl = (record = {}) =>
  getVoucherDocumentState(record) === 'paid' ? record.paid_pdf_url : record.pdf_url

export const getVoucherDocumentFilename = (record = {}) => {
  const state = getVoucherDocumentState(record)
  const suffix = state === 'paid' ? '-PAID' : state === 'void' ? '-VOID' : ''
  return `${record.voucher_number || 'payment-voucher'}${suffix}.pdf`
}

export const formatVoucherIssuedDate = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10)
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
