import { apiFetch, apiJson } from '../../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE

export const newVendorPaymentRequestKey = (prefix) =>
  globalThis.crypto?.randomUUID?.() ||
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const fetchVendorPayment = async (paymentId) => {
  const payload = await apiJson(`${API_BASE}vendor-payments/${paymentId}`, {
    credentials: 'include',
  })
  return payload?.data || null
}

export const transitionVendorPayment = (paymentId, action, remarks = '') =>
  apiJson(`${API_BASE}vendor-payments/${paymentId}/${action}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ remarks }),
  })

export const generateVendorPaymentVoucher = async (
  payment,
  requestKey = newVendorPaymentRequestKey('vendor-payment-voucher'),
) => {
  const paymentId = payment.id || payment.payment_id
  return apiJson(`${API_BASE}vendor-payments/${paymentId}/voucher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      version: Number(payment.version || 1),
      idempotency_key: requestKey,
    }),
  })
}

export const recordVendorPayment = async (payment, values, requestKey) => {
  const paymentId = payment.id || payment.payment_id
  const body = new FormData()
  body.append('paid_date', values.paidDate)
  body.append('amount', values.amount)
  body.append('method', values.method)
  body.append('reference_number', values.referenceNumber)
  body.append('remarks', values.remarks || '')
  body.append('version', String(Number(payment.version || 1)))
  body.append('idempotency_key', requestKey)
  const proofs =
    values.proofs || (values.proof ? [{ file: values.proof, captureMethod: 'upload' }] : [])
  proofs.forEach(({ file, captureMethod }) => {
    body.append('proofs[]', file)
    body.append('proof_capture_methods[]', captureMethod || 'upload')
  })

  return apiJson(`${API_BASE}vendor-payments/${paymentId}/transactions`, {
    method: 'POST',
    credentials: 'include',
    body,
  })
}

export const appendVendorPaymentProofs = (paymentId, transactionId, proofs, requestKey) => {
  const body = new FormData()
  proofs.forEach(({ file, captureMethod }) => {
    body.append('proofs[]', file)
    body.append('proof_capture_methods[]', captureMethod || 'upload')
  })
  body.append('idempotency_key', requestKey)
  return apiJson(`${API_BASE}vendor-payments/${paymentId}/transactions/${transactionId}/proofs`, {
    method: 'POST',
    credentials: 'include',
    body,
  })
}

export const supersedeVendorPaymentProof = (
  paymentId,
  transactionId,
  proofId,
  proof,
  reason,
  requestKey,
) => {
  const body = new FormData()
  body.append('proofs[]', proof.file)
  body.append('proof_capture_methods[]', proof.captureMethod || 'upload')
  body.append('reason', reason)
  body.append('idempotency_key', requestKey)
  return apiJson(
    `${API_BASE}vendor-payments/${paymentId}/transactions/${transactionId}/proofs/${proofId}/supersede`,
    {
      method: 'POST',
      credentials: 'include',
      body,
    },
  )
}

export const fetchVendorPaymentVouchers = (params = {}) =>
  apiJson(`${API_BASE}vendor-payment-vouchers?${new URLSearchParams(params).toString()}`, {
    credentials: 'include',
  })

export const bulkDownloadVendorPaymentVouchers = (voucherIds) =>
  apiFetch(`${API_BASE}vendor-payment-vouchers/bulk-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/zip' },
    credentials: 'include',
    body: JSON.stringify({ voucher_ids: voucherIds }),
  })
