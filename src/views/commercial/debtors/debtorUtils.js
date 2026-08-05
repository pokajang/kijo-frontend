export const emptyValue = '-'

export const debtorStatusScopes = Object.freeze([
  { key: 'open', label: 'Outstanding', apiValue: 'open' },
  { key: 'partial', label: 'Partially Paid', apiValue: 'Partially Paid' },
  { key: 'paid', label: 'Paid', apiValue: 'paid' },
  { key: 'cancelled', label: 'Cancelled', apiValue: 'cancelled' },
  { key: 'all', label: 'All', apiValue: 'all' },
])

const debtorStatusScopeMap = new Map(debtorStatusScopes.map((scope) => [scope.key, scope]))

export const normalizeDebtorStatusScope = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')

  if (normalized === 'outstanding') return 'open'
  if (normalized === 'partially-paid' || normalized === 'partially paid') return 'partial'
  return debtorStatusScopeMap.has(normalized) ? normalized : 'open'
}

export const getDebtorStatusScope = (value) =>
  debtorStatusScopeMap.get(normalizeDebtorStatusScope(value)) || debtorStatusScopeMap.get('open')

export const getDebtorStatusApiValue = (value) => getDebtorStatusScope(value).apiValue

export const getTodayDate = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

export const formatMoney = (value) =>
  `RM ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const formatCount = (value) => Number(value || 0).toLocaleString()

export const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') return 'success'
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'void')
    return 'danger'
  if (normalized === 'overdue') return 'danger'
  return 'warning'
}

export const getAgeTone = (ageDays) => {
  const age = Number(ageDays || 0)
  if (age >= 90) return 'dark'
  if (age >= 61) return 'danger'
  if (age >= 31) return 'warning'
  return 'secondary'
}

export const isOpenStatus = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
  return !['paid', 'cancelled', 'canceled', 'void'].includes(normalized)
}

export const normalizeDebtorRow = (row = {}) => {
  const hasOverdueDays = row.overdueDays !== undefined || row.overdue_days !== undefined
  const rawOverdueDays = row.overdueDays ?? row.overdue_days

  return {
    ...row,
    sourceType: row.sourceType || row.source_type || '',
    sourceId: row.sourceId ?? row.source_id ?? row.id,
    clientId: row.clientId ?? row.client_id ?? '',
    picId: row.picId ?? row.pic_id ?? '',
    invoiceRef: row.invoiceRef || row.invoice_ref_no || emptyValue,
    client: row.client || row.client_name || emptyValue,
    pic: row.pic || row.pic_name || emptyValue,
    picPhone: row.picPhone || row.pic_phone || '',
    picEmail: row.picEmail || row.pic_email || '',
    serviceType: row.serviceType || row.service_type || emptyValue,
    servicePeriod: row.servicePeriod || row.service_period || '',
    serviceStartDate: row.serviceStartDate || row.service_start_date || '',
    serviceEndDate: row.serviceEndDate || row.service_end_date || '',
    purpose: row.purpose || row.project_name || emptyValue,
    invoiceDate: row.invoiceDate || row.invoice_date || '',
    paymentTermsDays: row.paymentTermsDays ?? row.payment_terms_days ?? null,
    paymentTermsSource: row.paymentTermsSource || row.payment_terms_source || '',
    dueDate: row.dueDate || row.due_date || '',
    ageDays: Number(row.ageDays ?? row.age_days ?? 0),
    overdueDays:
      hasOverdueDays && rawOverdueDays !== null && rawOverdueDays !== ''
        ? Number(rawOverdueDays)
        : null,
    grandTotal: Number(row.grandTotal ?? row.grand_total ?? 0),
    paidTotal: Number(row.paidTotal ?? row.paid_total ?? row.paidAmount ?? row.paid_amount ?? 0),
    outstandingAmount: Number(
      row.outstandingAmount ??
        row.outstanding_amount ??
        Math.max(
          0,
          Number(row.grandTotal ?? row.grand_total ?? 0) -
            Number(row.paidTotal ?? row.paid_total ?? row.paidAmount ?? row.paid_amount ?? 0),
        ),
    ),
    paymentStatus: row.paymentStatus || row.payment_status || row.status || emptyValue,
    paymentCount: Number(row.paymentCount ?? row.payment_count ?? 0),
    lastPaymentDate:
      row.lastPaymentDate || row.last_payment_date || row.paidDate || row.paid_date || '',
    hasPaymentHistory: Boolean(
      row.hasPaymentHistory ??
        row.has_payment_history ??
        Number(row.paymentCount ?? row.payment_count ?? 0) > 0,
    ),
    status: row.status || emptyValue,
    paymentMethod: row.paymentMethod || row.payment_method || '',
    paidDate: row.paidDate || row.paid_date || '',
    paidAmount: row.paidAmount ?? row.paid_amount ?? null,
    paidRemarks: row.paidRemarks || row.paid_remarks || '',
    attachmentUrl: row.attachmentUrl || row.attachment_url || '',
    attachmentOriginalName: row.attachmentOriginalName || row.attachment_original_name || '',
    internalPicCode: row.internalPicCode || row.internal_pic_code || '',
    canEdit: Boolean(row.canEdit ?? row.can_edit),
    canDelete: Boolean(row.canDelete ?? row.can_delete),
    canMarkPaid: Boolean(row.canMarkPaid ?? row.can_mark_paid),
  }
}

export const manualDebtorToForm = (row = {}) => ({
  invoice_ref_no: row.invoiceRef || row.invoice_ref_no || '',
  client_id: row.clientId ?? row.client_id ?? '',
  pic_id: row.picId ?? row.pic_id ?? '',
  client_name: row.client || row.client_name || '',
  pic_name: row.pic || row.pic_name || '',
  pic_phone: row.picPhone || row.pic_phone || '',
  pic_email: row.picEmail || row.pic_email || '',
  service_type: row.serviceType || row.service_type || '',
  service_period: row.servicePeriod || row.service_period || '',
  service_start_date: row.serviceStartDate || row.service_start_date || '',
  service_end_date: row.serviceEndDate || row.service_end_date || '',
  purpose: row.purpose || '',
  invoice_date: row.invoiceDate || row.invoice_date || '',
  grand_total: row.grandTotal ?? row.grand_total ?? '',
  override_payment_terms:
    (row.paymentTermsSource || row.payment_terms_source || '') === 'manual_override',
  payment_terms_days: row.paymentTermsDays ?? row.payment_terms_days ?? '',
  payment_terms_source: row.paymentTermsSource || row.payment_terms_source || '',
  due_date: row.dueDate || row.due_date || '',
  attachmentUrl: row.attachmentUrl || '',
  attachmentOriginalName: row.attachmentOriginalName || '',
})
