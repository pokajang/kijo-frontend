import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  DataTableDetailFields,
  DataTableDetailShell,
  DataTableStatusBadge,
} from '../../../components/datatable'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import { resolveAssetUrl } from '../../../utils/assetUrls'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import { apiFetch, showApiToast } from '../../../api/apiClient'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import VendorPaymentWorkflowTimeline from '../payment-records/VendorPaymentWorkflowTimeline'
import { getVendorPaymentCurrentStageLabel } from '../payment-records/vendorPaymentWorkflow'
import VendorPaymentInvoicePreview from './VendorPaymentInvoicePreview'
import GeneratePaymentVoucherDialog from './GeneratePaymentVoucherDialog'
import RecordVendorPaymentModal from './RecordVendorPaymentModal'
import PaymentTransactionHistory from './payment-proof/PaymentTransactionHistory'
import VendorPaymentNextActionPanel from './VendorPaymentNextActionPanel'
import VendorPaymentVoucherPanel from './VendorPaymentVoucherPanel'
import VendorPaymentVoucherPreview from './VendorPaymentVoucherPreview'
import dialog from '../../../components/dialog/dialogService'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'
import { getVendorPaymentPermissions } from '../payment-records/vendorPaymentModel'
import { transitionVendorPayment } from '../payment-records/vendorPaymentApi'

const API_BASE = import.meta.env.VITE_API_BASE

const getStatusTone = (status) => {
  switch (status) {
    case 'Approved':
    case 'Paid':
      return 'success'
    case 'Pending':
    case 'Returned':
      return 'warning'
    case 'Rejected':
      return 'danger'
    default:
      return 'info'
  }
}

const actorDisplay = (actor, legacyCode, legacyId) => {
  if (actor?.display) return actor.display
  const fullName = String(actor?.full_name || actor?.fullName || '').trim()
  const nameCode = String(actor?.name_code || actor?.nameCode || legacyCode || '').trim()
  if (fullName && nameCode) return `${fullName} (${nameCode})`
  if (fullName || nameCode) return fullName || nameCode
  const staffId = Number(actor?.staff_id || actor?.staffId || legacyId || 0)
  return staffId > 0 ? `Historical actor unavailable (Staff #${staffId})` : '-'
}

const normalizePayment = (payment) => {
  if (!payment) return null
  const amount = Number(payment.amount || 0)
  return {
    ...payment,
    requested: payment.created_at || payment.requested || '',
    requestedDisplay: payment.created_at
      ? payment.created_at.split(' ')[0]
      : payment.requestedDisplay || '-',
    requestedBy: actorDisplay(
      payment.requested_by_actor,
      payment.created_by_name_code || payment.requestedBy,
      payment.created_by,
    ),
    approved: payment.date_approved || payment.approved || '',
    approvedDisplay: payment.date_approved
      ? payment.date_approved.split(' ')[0]
      : payment.approvedDisplay || 'In progress',
    checkedDisplay: payment.checked_at ? payment.checked_at.split(' ')[0] : '-',
    paidDisplay: payment.paid_date || '-',
    checkedBy: actorDisplay(
      payment.reviewed_by_actor,
      payment.checked_by_name_code,
      payment.checked_by,
    ),
    approvedBy: actorDisplay(
      payment.approved_by_actor,
      payment.approved_by_name_code,
      payment.approved_by,
    ),
    paidBy: actorDisplay(payment.paid_by_actor, payment.paid_by_name_code, payment.paid_by),
    paymentFor: payment.project_id
      ? payment.project_name || payment.paymentFor || 'Unnamed Project'
      : payment.payment_context || payment.paymentFor || '-',
    remarks: payment.remarks || 'Not provided',
    checkerRemarks: payment.checker_remarks || '-',
    approvalRemarks: payment.approval_remarks || '-',
    returnedRemarks: payment.returned_remarks || '-',
    rejectedRemarks: payment.rejected_remarks || '-',
    paidRemarks: payment.paid_remarks || '-',
    clientName: payment.client_name_snapshot || payment.client_name || '-',
    paymentTerms: payment.payment_terms_snapshot || payment.payment_terms || '-',
    type: payment.payment_type || payment.type || 'Not specified',
    method: payment.method || '-',
    status: payment.status || '-',
    invoice: payment.receipt_url || payment.receipt_path || payment.invoice || '',
    invoiceOriginalName: payment.receipt_original_name || 'invoice',
    invoiceState: payment.receipt_state || 'unavailable',
    amount,
    amountDisplay: formatMoney(amount),
    paidAmountDisplay: formatMoney(payment.paid_amount),
    currentWorkflowStage: getVendorPaymentCurrentStageLabel(payment),
  }
}

const PaymentHistoryDetailPage = () => {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getDetailReturnTo(
    location,
    location.pathname.startsWith('/vendor/payment-records')
      ? '/vendor/payment-records'
      : '/vendor/pay',
  )
  const [payment, setPayment] = useState(() => normalizePayment(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [invoiceVisible, setInvoiceVisible] = useState(false)
  const [generateVoucherVisible, setGenerateVoucherVisible] = useState(false)
  const [recordPaymentVisible, setRecordPaymentVisible] = useState(false)
  const [voucherPreview, setVoucherPreview] = useState(null)
  const { consumeEntity } = useAppNotifications()

  const loadPayment = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch(`${API_BASE}vendor-payments/${paymentId}`, {
        credentials: 'include',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.message || 'Unable to load payment details.')
      const found = payload?.data
      if (found) {
        setPayment(normalizePayment(found))
      } else {
        setPayment(null)
        setError('Payment record not found.')
      }
    } catch (err) {
      setError(err?.message || 'Unable to load payment details.')
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    loadPayment()
  }, [loadPayment])

  useEffect(() => {
    consumeEntity({
      moduleKey: 'vendor.payments',
      entityType: 'vendor_payment',
      entityId: paymentId,
      routePrefix: '/vendor/payment-records',
    }).catch(() => {})
  }, [consumeEntity, paymentId])

  const receiptUrl = resolveAssetUrl(payment?.invoice)
  const voucherUrl = resolveAssetUrl(payment?.voucher?.pdf_url)
  const paidVoucherUrl = resolveAssetUrl(payment?.voucher?.paid_pdf_url)
  const transition = async (action, label, { required = false } = {}) => {
    const remarks = await dialog.prompt(`${label} remarks`, {
      multiline: true,
      required,
      defaultValue: '',
    })
    if (remarks === null) return
    try {
      await transitionVendorPayment(paymentId, action, remarks)
      await loadPayment()
      dispatchAppNotificationsChanged()
      showApiToast(`Payment request ${label.toLowerCase()}.`)
    } catch (requestError) {
      dialog.alert(
        requestError?.message || `Unable to ${label.toLowerCase()} this payment request.`,
      )
    }
  }
  const handleNextAction = async (action) => {
    if (action === 'review') await transition('check', 'Review')
    if (action === 'approve') await transition('approve', 'Approval')
    if (action === 'generate-voucher') setGenerateVoucherVisible(true)
    if (action === 'record-payment') setRecordPaymentVisible(true)
    if (action === 'view-paid-voucher') setVoucherPreview('paid')
  }
  const permissions = getVendorPaymentPermissions(payment)
  const actions = [
    {
      key: 'invoice',
      label: 'View Invoice',
      disabled: !receiptUrl,
      onClick: () => setInvoiceVisible(true),
    },
    permissions.canReturn
      ? {
          key: 'return',
          label: 'Return for Amendment',
          onClick: () => transition('return', 'Return', { required: true }),
        }
      : null,
    permissions.canReject
      ? {
          key: 'reject',
          label: 'Reject Request',
          danger: true,
          onClick: () => transition('reject', 'Rejection', { required: true }),
        }
      : null,
  ].filter(Boolean)

  return (
    <>
      <DataTableDetailShell
        title={`Payment Request #${paymentId}`}
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={payment}
        actions={actions}
        emptyMessage="Payment record not found."
      >
        {payment && <VendorPaymentNextActionPanel payment={payment} onAction={handleNextAction} />}
        {(permissions.canViewVoucher || permissions.canGenerateVoucher) && (
          <VendorPaymentVoucherPanel
            payment={payment}
            onPreview={() => setVoucherPreview('approved')}
            onPreviewPaid={() => setVoucherPreview('paid')}
          />
        )}
        <h2 className="vendor-payment-section-title">Request details</h2>
        <DataTableDetailFields
          fields={[
            { key: 'requested', label: 'Date Requested', value: payment?.requestedDisplay },
            { key: 'requestedBy', label: 'Requested By', value: payment?.requestedBy },
            { key: 'checked', label: 'Date Reviewed', value: payment?.checkedDisplay },
            { key: 'checkedBy', label: 'Reviewed By', value: payment?.checkedBy },
            { key: 'approved', label: 'Date Approved', value: payment?.approvedDisplay },
            { key: 'approvedBy', label: 'Approved By', value: payment?.approvedBy },
            { key: 'paid', label: 'Paid Date', value: payment?.paidDisplay },
            { key: 'paidBy', label: 'Paid By', value: payment?.paidBy },
            { key: 'vendor', label: 'Vendor', value: payment?.vendor_name || '-' },
            { key: 'client', label: 'Client', value: payment?.clientName },
            { key: 'paymentFor', label: 'For', value: payment?.paymentFor },
            { key: 'terms', label: 'Payment Terms', value: payment?.paymentTerms },
            { key: 'type', label: 'Type', value: payment?.type },
            { key: 'method', label: 'Method', value: payment?.method },
            {
              key: 'status',
              label: 'Status',
              value: (
                <DataTableStatusBadge tone={getStatusTone(payment?.status)}>
                  {payment?.status || '-'}
                </DataTableStatusBadge>
              ),
            },
            {
              key: 'currentWorkflowStage',
              label: 'Current Stage',
              value: payment?.currentWorkflowStage,
            },
            { key: 'amount', label: 'Amount', value: payment?.amountDisplay },
            { key: 'paidAmount', label: 'Paid to Date', value: payment?.paidAmountDisplay },
            {
              key: 'invoiceState',
              label: 'Invoice Attachment',
              value: payment?.invoiceState === 'available' ? 'Available' : 'Unavailable',
            },
            {
              key: 'transactions',
              label: 'Payment Transactions',
              value: payment ? (
                <PaymentTransactionHistory
                  payment={payment}
                  canView={permissions.canViewPaymentEvidence}
                  canManage={permissions.canManagePaymentEvidence}
                  onChanged={loadPayment}
                />
              ) : (
                '-'
              ),
              xs: 12,
            },
            {
              key: 'workflow',
              label: 'Workflow',
              value: payment ? <VendorPaymentWorkflowTimeline payment={payment} /> : '-',
              xs: 12,
            },
            { key: 'remarks', label: 'Remarks', value: payment?.remarks, xs: 12 },
            {
              key: 'checkerRemarks',
              label: 'Review Remarks',
              value: payment?.checkerRemarks,
              xs: 12,
            },
            {
              key: 'approvalRemarks',
              label: 'Approval Remarks',
              value: payment?.approvalRemarks,
              xs: 12,
            },
            {
              key: 'returnedRemarks',
              label: 'Returned Remarks',
              value: payment?.returnedRemarks,
              xs: 12,
            },
            {
              key: 'rejectedRemarks',
              label: 'Rejected Remarks',
              value: payment?.rejectedRemarks,
              xs: 12,
            },
            { key: 'paidRemarks', label: 'Paid Remarks', value: payment?.paidRemarks, xs: 12 },
          ]}
        />
      </DataTableDetailShell>

      <VendorPaymentInvoicePreview
        visible={invoiceVisible}
        onClose={() => setInvoiceVisible(false)}
        url={receiptUrl}
        originalName={payment?.invoiceOriginalName}
      />
      <GeneratePaymentVoucherDialog
        visible={generateVoucherVisible}
        payment={payment}
        onClose={() => setGenerateVoucherVisible(false)}
        onGenerated={async () => {
          setGenerateVoucherVisible(false)
          await loadPayment()
          setVoucherPreview('approved')
          showApiToast('Payment voucher generated.')
        }}
      />
      <RecordVendorPaymentModal
        visible={recordPaymentVisible}
        payment={payment}
        onClose={() => setRecordPaymentVisible(false)}
        onRecorded={async () => {
          setRecordPaymentVisible(false)
          await loadPayment()
          showApiToast('Payment transaction recorded.')
        }}
      />
      <VendorPaymentVoucherPreview
        visible={Boolean(voucherPreview)}
        onClose={() => setVoucherPreview(null)}
        url={voucherPreview === 'paid' ? paidVoucherUrl : voucherUrl}
        voucherNumber={payment?.voucher?.voucher_number}
        documentState={
          voucherPreview === 'paid' ? 'paid' : payment?.voucher?.document_state || 'approved'
        }
      />
    </>
  )
}

export default PaymentHistoryDetailPage
