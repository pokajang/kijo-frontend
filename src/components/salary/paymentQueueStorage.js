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
  canViewValues: row.canViewValues !== false,
  canMarkPaid: Boolean(row.canMarkPaid),
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
      idempotency_key: `${staffId}:${period}:${paymentDate}:${paymentReference || paymentMethod}`,
    }),
  })

  dispatchAppNotificationsChanged()
  return payload.run || null
}
