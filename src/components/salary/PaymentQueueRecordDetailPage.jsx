import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { DataTableDetailShell, DataTableDetailFields, DataTableStatusBadge } from '../datatable'
import { formatMoney } from './salaryCalculations'
import {
  fetchPaymentQueueDetail,
  markPaymentQueuePaid,
  undoPaymentQueuePaid,
} from './paymentQueueStorage'
import { PaymentQueueActionModal } from './PaymentQueueRecords'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'

const todayValue = () => new Date().toLocaleDateString('en-CA')

const statusTone = {
  'Pending Payment': 'info',
  Paid: 'success',
  Blocked: 'warning',
}

const formatQueueMoney = (value, restricted) => {
  if (restricted || value === null || value === undefined) return 'Restricted'
  return formatMoney(value)
}

const PaymentQueueRecordDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { consumeRouteGroup } = useAppNotifications()
  const { staffId, period } = useParams()
  const returnTo = getDetailReturnTo(
    location,
    location.pathname.startsWith('/financial')
      ? '/financial/payment-queue'
      : '/my/salary/payment-queue',
  )
  const isFinancial = location.pathname.startsWith('/financial')
  const [record, setRecord] = useState(location.state?.record || null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionContext, setActionContext] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: todayValue(),
    paymentReference: '',
    paymentMethod: '',
    remarks: '',
  })
  const [undoReason, setUndoReason] = useState('')

  const loadDetail = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchPaymentQueueDetail(staffId, period)
      setRecord(payload.row)
      setItems(payload.items || [])
    } catch (err) {
      setError(err?.message || 'Could not load payment queue detail.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, period])

  useEffect(() => {
    consumeRouteGroup({
      routePrefix: isFinancial ? '/financial/payment-queue' : '/my/salary/payment-queue',
      moduleKeys: [isFinancial ? 'financial.payment-queue' : 'my.payment-queue'],
    }).catch(() => {})
  }, [consumeRouteGroup, isFinancial, location.pathname])

  const fields = useMemo(
    () => [
      { label: 'Employee', value: record?.staffName || 'Restricted' },
      { label: 'Staff Code', value: record?.staffCode || '-' },
      { label: 'Period', value: record?.periodLabel || record?.period || '-' },
      {
        label: 'Status',
        value: (
          <DataTableStatusBadge tone={statusTone[record?.status] || 'secondary'}>
            {record?.status || 'Pending Payment'}
          </DataTableStatusBadge>
        ),
      },
      { label: 'Salary Due', value: formatQueueMoney(record?.salaryDue, record?.restricted) },
      {
        label: 'Other Claims',
        value: formatQueueMoney(record?.otherClaimDue, record?.restricted),
      },
      { label: 'Total Due', value: formatQueueMoney(record?.totalDue, record?.restricted) },
      { label: 'Items', value: record?.restricted ? 'Restricted' : (record?.itemCount ?? '-') },
      ...(record?.status === 'Paid'
        ? [
            { label: 'Payment Date', value: record?.paymentDate || '-' },
            { label: 'Reference', value: record?.paymentReference || '-' },
            { label: 'Method', value: record?.paymentMethod || '-' },
            { label: 'Paid At', value: record?.paidAt || '-' },
          ]
        : []),
    ],
    [record],
  )

  const openActionModal = (type) => {
    setNotice('')
    setError('')
    setActionContext({ type, rows: [record] })
    setUndoReason('')
    setPaymentForm({
      paymentDate: todayValue(),
      paymentReference: '',
      paymentMethod: '',
      remarks: '',
    })
  }

  const closeActionModal = () => {
    if (!isSubmitting) setActionContext(null)
  }

  const handleSubmitAction = async () => {
    if (!record || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    setNotice('')
    try {
      const payload =
        actionContext?.type === 'undo-paid'
          ? await undoPaymentQueuePaid({
              staffId: record.staffId,
              period: record.period,
              reason: undoReason.trim(),
            })
          : await markPaymentQueuePaid({
              staffId: record.staffId,
              period: record.period,
              ...paymentForm,
            })
      setNotice(payload?.message || 'Payment queue updated.')
      setActionContext(null)
      await loadDetail()
    } catch (err) {
      setError(err?.message || 'Could not update payment queue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const actions =
    record && isFinancial
      ? [
          {
            key: 'mark-paid',
            label: 'Mark Paid',
            hidden: record.status === 'Paid',
            disabled: !record.canMarkPaid,
            tooltip:
              record.blockReason || (!record.canMarkPaid ? 'This row cannot be marked paid.' : ''),
            buttonColor: 'success',
            onClick: () => openActionModal('mark-paid'),
          },
          {
            key: 'undo-paid',
            label: 'Undo Paid',
            hidden: record.status !== 'Paid',
            disabled: !record.canUndoPaid,
            tooltip: !record.canUndoPaid ? 'You cannot undo this payment.' : '',
            buttonColor: 'warning',
            onClick: () => openActionModal('undo-paid'),
          },
        ]
      : []

  const isUndoAction = actionContext?.type === 'undo-paid'

  return (
    <DataTableDetailShell
      title={isFinancial ? 'Payment Queue Details' : 'My Payment Details'}
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={record}
      actions={actions}
      emptyMessage="Payment queue row not found."
    >
      {notice && (
        <CAlert color="success" className="py-2">
          {notice}
        </CAlert>
      )}
      {record?.blockReason && (
        <CAlert color="warning" className="py-2">
          {record.blockReason}
        </CAlert>
      )}
      <DataTableDetailFields fields={fields} />
      <section className="mt-4" aria-label="Payment items">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <strong>Payment Items</strong>
          {loading && <CSpinner size="sm" />}
        </div>
        {record?.restricted ? (
          <CAlert color="warning" className="py-2">
            Payment values are restricted to workflow and payment actors.
          </CAlert>
        ) : (
          <CTable small responsive align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Record</CTableHeaderCell>
                <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                <CTableHeaderCell scope="col" className="text-end">
                  Amount
                </CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={3} className="text-center text-body-secondary">
                    No payment items found.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                items.map((item) => (
                  <CTableRow key={`${item.subjectType}-${item.subjectId}`}>
                    <CTableDataCell>
                      {!isFinancial &&
                      item.subjectType === 'other_claim_application' &&
                      item.subjectId ? (
                        <CButton
                          type="button"
                          color="link"
                          className="p-0 text-start"
                          onClick={() =>
                            navigate(
                              `/my/salary/other-claims/records/${encodeURIComponent(item.subjectId)}`,
                              { state: { returnTo } },
                            )
                          }
                        >
                          {item.label || '-'}
                        </CButton>
                      ) : (
                        item.label || '-'
                      )}
                    </CTableDataCell>
                    <CTableDataCell>{item.status || '-'}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatQueueMoney(item.amount, false)}
                    </CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        )}
      </section>
      <PaymentQueueActionModal
        visible={Boolean(actionContext)}
        isUndoAction={isUndoAction}
        isBulkAction={false}
        rowCount={1}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        undoReason={undoReason}
        setUndoReason={setUndoReason}
        isSubmitting={isSubmitting}
        canSubmit={
          isUndoAction
            ? undoReason.trim().length > 0
            : Boolean(
                paymentForm.paymentDate &&
                  paymentForm.paymentReference.trim() &&
                  paymentForm.paymentMethod.trim(),
              )
        }
        onClose={closeActionModal}
        onSubmit={handleSubmitAction}
      />
    </DataTableDetailShell>
  )
}

export default PaymentQueueRecordDetailPage
