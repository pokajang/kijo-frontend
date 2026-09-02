import { apiJson } from '../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const attachmentUrl = (path) => `${API_BASE}${path}`

const request = (path, options = {}) => apiJson(`${API_BASE}${path}`, options)
const post = (path, body = {}) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const fetchPaymentSummaries = async (period = '') => {
  const query = period ? `?payment_period=${encodeURIComponent(period)}` : ''
  const payload = await request(`hr/salary/payment-summaries${query}`)
  return {
    records: Array.isArray(payload.records) ? payload.records : [],
    defaults: payload.defaults || {},
  }
}

export const fetchPaymentSummaryCandidates = async (filters = {}) => {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  })
  const payload = await request(
    `hr/salary/payment-summaries/candidates${query.size ? `?${query.toString()}` : ''}`,
  )
  return Array.isArray(payload.records) ? payload.records : []
}

export const checkPaymentSummaryReadiness = async (selectedItems, replacesSummaryId = null) =>
  post('hr/salary/payment-summaries/readiness', {
    selected_items: selectedItems,
    replaces_summary_id: replacesSummaryId,
  })

export const preparePaymentSummary = async ({
  paymentPeriod,
  recipientEmail,
  recipientName,
  remarks,
  batchDate,
  batchName,
  selectedItems,
  replacesSummaryId,
}) =>
  post('hr/salary/payment-summaries', {
    payment_period: paymentPeriod,
    batch_date: batchDate,
    batch_name: batchName,
    selected_items: selectedItems,
    replaces_summary_id: replacesSummaryId,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    remarks,
  })

export const fetchPaymentSummary = async (id) =>
  request(`hr/salary/payment-summaries/${encodeURIComponent(id)}`)

export const issuePaymentSummary = async (id) =>
  post(`hr/salary/payment-summaries/${encodeURIComponent(id)}/issue`)

export const resendPaymentSummary = async (id) =>
  post(`hr/salary/payment-summaries/${encodeURIComponent(id)}/resend`)

export const revokePaymentSummary = async (id, reason) =>
  post(`hr/salary/payment-summaries/${encodeURIComponent(id)}/revoke`, { reason })

export const markPaymentSummaryPaid = async (id, payment) =>
  post(`hr/salary/payment-summaries/${encodeURIComponent(id)}/mark-paid`, payment)

export const updatePaymentSummaryCandidatePreference = async (preference) =>
  request('hr/salary/payment-summaries/candidates/preference', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preference),
  })

export const fetchBossPaymentSummaryStatus = async (token) =>
  post('public/salary/payment-summary/status', { token })

export const requestBossPaymentSummaryCode = async (token) =>
  post('public/salary/payment-summary/request-code', { token })

export const verifyBossPaymentSummary = async (token, code) =>
  post('public/salary/payment-summary/verify', { token, code })

export const fetchBossPaymentSummary = async (token) =>
  post('public/salary/payment-summary/show', { token })

export const getPublicPaymentSummaryAttachmentUrl = (file = {}) =>
  file.accessKey
    ? attachmentUrl(
        `public/salary/payment-summary/attachments/${encodeURIComponent(file.accessKey)}`,
      )
    : ''

export const getFinancePaymentSummaryAttachmentUrl = (summaryId, file = {}) =>
  summaryId && file.accessKey
    ? attachmentUrl(
        `hr/salary/payment-summaries/${encodeURIComponent(summaryId)}/attachments/${encodeURIComponent(file.accessKey)}`,
      )
    : ''
