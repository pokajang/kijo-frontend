import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import {
  DataTableDetailFields,
  DataTableDetailShell,
  DataTableStatusBadge,
} from '../../../components/datatable'
import { findRecordByPagedEndpoint, sameId } from '../../../utils/detailPages'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import { resolveAssetUrl } from '../../../utils/assetUrls'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import VendorPaymentWorkflowTimeline from '../payment-records/VendorPaymentWorkflowTimeline'
import { getVendorPaymentCurrentStageLabel } from '../payment-records/vendorPaymentWorkflow'

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

const normalizePayment = (payment) => {
  if (!payment) return null
  const amount = Number(payment.amount || 0)
  return {
    ...payment,
    requested: payment.created_at || payment.requested || '',
    requestedDisplay: payment.created_at
      ? payment.created_at.split(' ')[0]
      : payment.requestedDisplay || '-',
    requestedBy: payment.created_by_name_code || payment.requestedBy || '-',
    approved: payment.date_approved || payment.approved || '',
    approvedDisplay: payment.date_approved
      ? payment.date_approved.split(' ')[0]
      : payment.approvedDisplay || 'In progress',
    checkedDisplay: payment.checked_at ? payment.checked_at.split(' ')[0] : '-',
    paidDisplay: payment.paid_date || '-',
    checkedBy: payment.checked_by || payment.checked_by_name_code || '-',
    approvedBy: payment.approved_by_name_code || payment.approved_by || '-',
    paidBy: payment.paid_by_name_code || payment.paid_by || '-',
    paymentFor: payment.project_id
      ? payment.project_name || payment.paymentFor || 'Unnamed Project'
      : payment.payment_context || payment.paymentFor || '-',
    remarks: payment.remarks || 'Not provided',
    checkerRemarks: payment.checker_remarks || '-',
    approvalRemarks: payment.approval_remarks || '-',
    returnedRemarks: payment.returned_remarks || '-',
    rejectedRemarks: payment.rejected_remarks || '-',
    paidRemarks: payment.paid_remarks || '-',
    type: payment.payment_type || payment.type || 'Not specified',
    method: payment.method || '-',
    status: payment.status || '-',
    invoice: payment.receipt_url || payment.receipt_path || payment.invoice || '',
    amount,
    amountDisplay: `RM ${amount.toFixed(2)}`,
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
  const paymentRef = useRef(payment)
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [invoiceVisible, setInvoiceVisible] = useState(false)
  const { consumeEntity } = useAppNotifications()

  useEffect(() => {
    paymentRef.current = payment
  }, [payment])

  const loadPayment = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const found = await findRecordByPagedEndpoint({
        url: `${API_BASE}vendor-payments`,
        id: paymentId,
        dataKeys: ['history', 'data'],
      })
      if (found) {
        setPayment(normalizePayment(found))
      } else {
        const current = paymentRef.current
        if (current && sameId(current.id, paymentId)) return
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
  const actions = useMemo(
    () => [
      {
        key: 'invoice',
        label: 'View Invoice',
        disabled: !receiptUrl,
        onClick: () => setInvoiceVisible(true),
      },
    ],
    [receiptUrl],
  )

  return (
    <>
      <DataTableDetailShell
        title="Payment History Details"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={payment}
        actions={actions}
        emptyMessage="Payment record not found."
      >
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
            { key: 'paymentFor', label: 'For', value: payment?.paymentFor },
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

      <CModal size="lg" visible={invoiceVisible} onClose={() => setInvoiceVisible(false)}>
        <CModalHeader>
          <CModalTitle>Invoice Preview</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {receiptUrl ? (
            <iframe
              src={receiptUrl}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title="Invoice Preview"
            />
          ) : (
            <div className="text-center text-muted">No invoice selected.</div>
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default PaymentHistoryDetailPage
