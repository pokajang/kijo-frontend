const capability = (payment, key, legacyKey = key) => {
  const permissions = payment?.permissions || {}
  if (typeof permissions[key] === 'boolean') return permissions[key]
  if (typeof payment?.[key] === 'boolean') return payment[key]
  return typeof payment?.[legacyKey] === 'boolean' ? payment[legacyKey] : false
}

export const getVendorPaymentPermissions = (payment = {}) => ({
  canCheck: capability(payment, 'can_check'),
  canApprove: capability(payment, 'can_approve'),
  canReturn: capability(payment, 'can_return'),
  canReject: capability(payment, 'can_reject'),
  canEdit: capability(payment, 'can_edit'),
  canCancel: capability(payment, 'can_cancel'),
  canResubmit: capability(payment, 'can_resubmit'),
  canGenerateVoucher: capability(payment, 'can_generate_voucher'),
  canViewVoucher: capability(payment, 'can_view_voucher'),
  canDownloadVoucher: capability(payment, 'can_download_voucher'),
  canRecordPayment: capability(payment, 'can_record_payment', 'can_mark_paid'),
  canViewPaymentEvidence: capability(payment, 'can_view_payment_evidence'),
  canManagePaymentEvidence: capability(payment, 'can_manage_payment_evidence'),
})

export const getVendorPaymentStage = (payment = {}) => {
  const status = String(payment.status || '').trim()
  const voucherIssued = Boolean(payment.voucher || payment.voucher_issued)
  if (status === 'Pending') return { label: 'Pending Review', tone: 'warning' }
  if (status === 'Checked') return { label: 'Pending Approval', tone: 'info' }
  if (status === 'Approved' && !voucherIssued) {
    return { label: 'Approved — Voucher Required', tone: 'warning' }
  }
  if (status === 'Approved') return { label: 'Approved — Awaiting Payment', tone: 'primary' }
  if (status === 'Partially Paid') return { label: 'Partially Paid', tone: 'info' }
  if (status === 'Paid') return { label: 'Paid', tone: 'success' }
  if (status === 'Returned') return { label: 'Returned', tone: 'warning' }
  if (status === 'Rejected' || status === 'Cancelled') {
    return { label: status, tone: 'danger' }
  }
  return { label: status || 'Unknown', tone: 'secondary' }
}

export const getVendorPaymentNextAction = (payment = {}) => {
  const permissions = getVendorPaymentPermissions(payment)
  const status = String(payment.status || '')
  if (permissions.canCheck) {
    return {
      key: 'review',
      label: 'Review Payment Request',
      help: 'Confirm the invoice, vendor, purpose, and approved amount before sending for approval.',
    }
  }
  if (permissions.canApprove) {
    return {
      key: 'approve',
      label: 'Approve Payment Request',
      help: 'Approve this request so finance can issue its payment voucher.',
    }
  }
  if (permissions.canGenerateVoucher) {
    return {
      key: 'generate-voucher',
      label: status === 'Paid' ? 'Generate Historical Voucher' : 'Generate Payment Voucher',
      help: 'Create the approved internal authorization document before settlement is recorded.',
    }
  }
  if (permissions.canRecordPayment) {
    return {
      key: 'record-payment',
      label: status === 'Partially Paid' ? 'Record Remaining Payment' : 'Record Payment',
      help: 'Record the actual bank settlement, reference, date, and supporting proof.',
    }
  }
  if (status === 'Paid' && payment.voucher?.paid_pdf_url) {
    return {
      key: 'view-paid-voucher',
      label: 'View Paid Voucher',
      help: 'Open the settlement copy containing the completed payment transactions.',
    }
  }
  return null
}

export const getVendorPaymentBalance = (payment = {}) => {
  const record = payment || {}
  const approved = Number(record.amount || 0)
  const paid = Number(record.paid_amount || 0)
  return {
    approved,
    paid,
    remaining: Math.max(0, Math.round((approved - paid) * 100) / 100),
  }
}
