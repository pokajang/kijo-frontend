import { apiJson } from '../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const nullableMoney = (value) => {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export const normalizePaymentQueueRow = (row = {}) => ({
  id: row.id || `${row.staffId ?? 'restricted'}:${row.period || row.paymentPeriod || ''}`,
  staffId: row.staffId,
  staffName: row.staffName || '',
  staffCode: row.staffCode || '',
  period: row.period || '',
  periodLabel: row.periodLabel || row.period || '',
  salaryDue: nullableMoney(row.salaryDue),
  otherClaimDue: nullableMoney(row.otherClaimDue),
  totalDue: nullableMoney(row.totalDue),
  salaryCount: Number(row.salaryCount || 0),
  otherClaimCount: Number(row.otherClaimCount || 0),
  itemCount: Number(row.itemCount || 0),
  status: row.status || 'Pending Payment',
  blockReason: row.blockReason || '',
  lastApprovedAt: row.lastApprovedAt || '',
  paidAt: row.paidAt || '',
  paidBy: row.paidBy || '',
  paymentRunId: row.paymentRunId || null,
  paymentSummaryId: row.paymentSummaryId || null,
  paymentDate: row.paymentDate || '',
  paymentReference: row.paymentReference || '',
  paymentMethod: row.paymentMethod || '',
  remarks: row.remarks || '',
  voidedAt: row.voidedAt || '',
  canViewValues: row.canViewValues !== false,
  canMarkPaid: Boolean(row.canMarkPaid),
  canUndoPaid: Boolean(row.canUndoPaid),
  restricted: Boolean(row.restricted || row.canViewValues === false),
})

export const normalizePaymentQueueDetail = (payload = {}) => ({
  row: normalizePaymentQueueRow(payload.row || {}),
  items: Array.isArray(payload.items)
    ? payload.items.map((item) => ({
        subjectType: item.subjectType || '',
        subjectId: item.subjectId,
        label: item.label || '',
        period: item.period || '',
        amount: nullableMoney(item.amount),
        status: item.status || '',
        approvedAt: item.approvedAt || '',
      }))
    : [],
})

export const fetchPaymentQueue = async () => {
  const payload = await apiJson(`${API_BASE}hr/salary/payment-queue`)
  return Array.isArray(payload.records) ? payload.records.map(normalizePaymentQueueRow) : []
}

export const fetchPaymentQueueDetail = async (staffId, period) => {
  const payload = await apiJson(
    `${API_BASE}hr/salary/payment-queue/${encodeURIComponent(staffId)}/${encodeURIComponent(
      period,
    )}`,
  )
  return normalizePaymentQueueDetail(payload)
}

export const markPaymentQueuePaid = async ({
  staffId,
  period,
  paymentDate,
  paymentReference = '',
  paymentMethod = '',
  remarks = '',
  paymentSummaryId,
}) => {
  const payload = await apiJson(`${API_BASE}hr/salary/payment-queue/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staff_id: staffId,
      payment_period: period,
      payment_date: paymentDate,
      payment_reference: paymentReference,
      payment_method: paymentMethod,
      remarks,
      payment_summary_id: paymentSummaryId,
      idempotency_key: `${staffId}:${period}:${paymentDate}:${paymentReference || paymentMethod}`,
    }),
  })

  dispatchAppNotificationsChanged()
  return payload
}

export const undoPaymentQueuePaid = async ({ staffId, period, reason }) => {
  const payload = await apiJson(`${API_BASE}hr/salary/payment-queue/undo-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staff_id: staffId,
      payment_period: period,
      reason,
    }),
  })

  dispatchAppNotificationsChanged()
  return payload
}

const toBulkRowsPayload = (rows = []) =>
  rows.map((row) => ({
    staff_id: row.staffId,
    payment_period: row.period,
    payment_summary_id: row.paymentSummaryId,
  }))

export const bulkMarkPaymentQueuePaid = async (rows, paymentForm = {}) => {
  const payload = await apiJson(`${API_BASE}hr/salary/payment-queue/bulk-mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: toBulkRowsPayload(rows),
      payment_date: paymentForm.paymentDate,
      payment_reference: paymentForm.paymentReference || '',
      payment_method: paymentForm.paymentMethod || '',
      remarks: paymentForm.remarks || '',
    }),
  })

  dispatchAppNotificationsChanged()
  return payload
}

export const bulkUndoPaymentQueuePaid = async (rows, reason) => {
  const payload = await apiJson(`${API_BASE}hr/salary/payment-queue/bulk-undo-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: toBulkRowsPayload(rows),
      reason,
    }),
  })

  dispatchAppNotificationsChanged()
  return payload
}
