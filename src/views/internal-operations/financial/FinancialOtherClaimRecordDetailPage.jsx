import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import {
  DataTableDetailFields,
  DataTableDetailShell,
  DataTableStatusBadge,
} from '../../../components/datatable'
import { AttachmentPreviewModal } from '../../../components/salary/claim-ui/ClaimFormPrimitives'
import OtherClaimAuditTrail from '../../../components/salary/OtherClaimAuditTrail'
import { formatMoney } from '../../../components/salary/salaryCalculations'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import {
  fetchFinancialOtherClaimRecord,
  submitFinancialOtherClaimAction,
} from './financialOtherClaimApi'

const categoryLabel = {
  mileage: 'Mileage',
  taxi: 'Taxi / e-hailing',
  toll: 'Toll',
  parking: 'Parking',
  other: 'Other travel expense',
  legacy_combined: 'Legacy travel expense',
}

const statusTone = {
  Submitted: 'info',
  Checked: 'primary',
  Approved: 'success',
  Paid: 'success',
  Rejected: 'danger',
  Cancelled: 'warning',
}

const displayStatus = (status) => (status === 'Cancelled' ? 'Withdrawn' : status)

const actionColor = (action) => {
  if (action === 'reject') return 'danger'
  if (action === 'approve') return 'success'
  return 'info'
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
}

const claimDetails = (claim) => {
  const category = claim.travelCategory || (claim.type === 'Mileage' ? 'mileage' : '')
  const values = []
  if (category) values.push(categoryLabel[category] || category)
  if (category === 'mileage') {
    const method =
      claim.distanceMethod === 'return_same_route'
        ? 'Return, same route'
        : claim.distanceMethod === 'total_distance'
          ? 'Total distance travelled'
          : 'One-way trip'
    const claimedKm =
      claim.distanceMethod === 'return_same_route'
        ? Number(claim.km || 0) * 2
        : Number(claim.km || 0)
    values.push(`${claim.startLocation || '-'} to ${claim.endLocation || '-'}`)
    values.push(`${method}: ${claim.km || 0} KM entered, ${claimedKm} KM claimable`)
    values.push(`${formatMoney(claim.mileageRate || 0)} per KM`)
    values.push(
      `${claimedKm} KM × ${formatMoney(claim.mileageRate || 0)} = ${formatMoney(claim.amount || 0)}`,
    )
  } else if (category === 'taxi' || category === 'toll') {
    values.push(`${claim.startLocation || '-'} to ${claim.endLocation || '-'}`)
  }
  if (claim.locationDetail) values.push(claim.locationDetail)
  if (claim.expenseType) values.push(claim.expenseType)
  if (claim.sourceLabel) values.push(`Charge to: ${claim.sourceLabel}`)
  return values.filter(Boolean)
}

const FinancialOtherClaimRecordDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getDetailReturnTo(location, '/financial/other-claim-records')
  const [record, setRecord] = useState(location.state?.record || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [actionContext, setActionContext] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [actionError, setActionError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRecord(await fetchFinancialOtherClaimRecord(id))
    } catch (err) {
      setError(err?.message || 'Unable to load other claim details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const fields = useMemo(
    () => [
      {
        label: 'Claim reference',
        value: `${record?.claimReference || '-'} rev ${record?.revisionNo || 1}`,
      },
      { label: 'Staff', value: record?.staffName || record?.staffCode || '-' },
      { label: 'Department', value: record?.staffDepartment || '-' },
      { label: 'Position', value: record?.staffPosition || '-' },
      { label: 'Claim month', value: record?.claimMonth || '-' },
      { label: 'Submitted', value: formatDateTime(record?.submittedAt) },
      {
        label: 'Status',
        value: (
          <DataTableStatusBadge tone={statusTone[record?.status] || 'secondary'}>
            {displayStatus(record?.status) || '-'}
          </DataTableStatusBadge>
        ),
      },
      { label: 'Claim total', value: formatMoney(record?.claimsTotal || 0) },
    ],
    [record],
  )

  const actions = Array.isArray(record?.workflow?.availableActions)
    ? record.workflow.availableActions
    : []

  const openAction = (action) => {
    setActionError('')
    setRemarks('')
    setActionContext(action)
  }

  const submitAction = async () => {
    if (!actionContext || !record || submitting) return
    if (actionContext.action === 'reject' && !remarks.trim()) {
      setActionError('Enter a reason before rejecting this claim.')
      document.getElementById('financialOtherClaimActionRemarks')?.focus()
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      const updated = await submitFinancialOtherClaimAction(
        record.id,
        actionContext.action,
        remarks,
        record.workflow?.instanceId,
        record.recordVersion,
      )
      setActionContext(null)
      setRemarks('')
      if (updated) setRecord(updated)
      await loadRecord()
    } catch (err) {
      setActionError(err?.message || 'Unable to update this claim.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DataTableDetailShell
        title="Review Other Claim"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={record}
        actions={actions.map((action) => ({
          key: action.action,
          label: action.label,
          buttonColor: actionColor(action.action),
          onClick: () => openAction(action),
        }))}
        emptyMessage="Other claim record not found."
      >
        <DataTableDetailFields fields={fields} />
        {record?.status === 'Rejected' && (record.checkedRemarks || record.approvedRemarks) && (
          <CAlert color="danger" className="mt-3 py-2">
            <strong>Rejection reason:</strong> {record.approvedRemarks || record.checkedRemarks}
          </CAlert>
        )}
        <section className="mt-4" aria-labelledby="financialOtherClaimItems">
          <h3 className="h6 mb-2" id="financialOtherClaimItems">
            Claim items and evidence
          </h3>
          <CTable responsive small align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Item</CTableHeaderCell>
                <CTableHeaderCell scope="col">Details</CTableHeaderCell>
                <CTableHeaderCell scope="col">Evidence</CTableHeaderCell>
                <CTableHeaderCell scope="col" className="text-end">
                  Amount
                </CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {(record?.claims || []).length ? (
                record.claims.map((claim) => {
                  const attachments = claim.attachments || []
                  return (
                    <CTableRow key={claim.recordItemId || claim.id}>
                      <CTableDataCell>
                        <strong>{claim.description || claim.type}</strong>
                        <div className="small text-body-secondary">{claim.date || '-'}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        {claimDetails(claim).map((detail) => (
                          <div className="small" key={detail}>
                            {detail}
                          </div>
                        ))}
                      </CTableDataCell>
                      <CTableDataCell>
                        {attachments.length ? (
                          attachments.map((attachment) => (
                            <CButton
                              key={attachment.id || attachment.clientId}
                              type="button"
                              size="sm"
                              color="secondary"
                              variant="outline"
                              className="me-1 mb-1"
                              onClick={() => setPreviewAttachment(attachment)}
                            >
                              {attachment.purpose ? `${attachment.purpose}: ` : ''}
                              {attachment.name}
                            </CButton>
                          ))
                        ) : (
                          <span className="text-body-secondary">No evidence</span>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <strong>{formatMoney(claim.amount || 0)}</strong>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-body-secondary">
                    No claim items found.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </section>
        <section className="mt-4" aria-labelledby="financialOtherClaimWorkflow">
          <h3 className="h6 mb-2" id="financialOtherClaimWorkflow">
            Workflow history
          </h3>
          <CTable responsive small>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Action</CTableHeaderCell>
                <CTableHeaderCell scope="col">By</CTableHeaderCell>
                <CTableHeaderCell scope="col">When</CTableHeaderCell>
                <CTableHeaderCell scope="col">Remarks</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {(record?.workflow?.history || []).length ? (
                record.workflow.history.map((entry) => (
                  <CTableRow key={entry.id}>
                    <CTableDataCell>{entry.label || entry.action}</CTableDataCell>
                    <CTableDataCell>{entry.actorName || entry.actorCode || '-'}</CTableDataCell>
                    <CTableDataCell>{formatDateTime(entry.actedAt)}</CTableDataCell>
                    <CTableDataCell>{entry.remarks || '-'}</CTableDataCell>
                  </CTableRow>
                ))
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-body-secondary">
                    No workflow events recorded.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </section>
        <OtherClaimAuditTrail
          events={record?.auditEvents || []}
          formatDateTime={formatDateTime}
          headingClassName="h6 mb-2"
          id="financialOtherClaimAudit"
        />
        <section className="mt-4" aria-labelledby="financialOtherClaimPayments">
          <h3 className="h6 mb-2" id="financialOtherClaimPayments">
            Payment history
          </h3>
          <CTable responsive small>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                <CTableHeaderCell scope="col">Payment details</CTableHeaderCell>
                <CTableHeaderCell scope="col">Audit</CTableHeaderCell>
                <CTableHeaderCell scope="col" className="text-end">
                  Amount
                </CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {(record?.paymentHistory || []).length ? (
                record.paymentHistory.map((payment) => (
                  <CTableRow key={payment.id}>
                    <CTableDataCell>{payment.status}</CTableDataCell>
                    <CTableDataCell>
                      <div>{payment.paymentDate || '-'}</div>
                      <div className="small text-body-secondary">
                        {payment.paymentMethod || '-'} · {payment.paymentReference || '-'}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div>Paid by {payment.paidBy || '-'}</div>
                      <div className="small text-body-secondary">
                        {formatDateTime(payment.paidAt)}
                      </div>
                      {payment.reversedAt && (
                        <div className="small text-danger mt-1">
                          Reversed by {payment.reversedBy || '-'}: {payment.reversalReason || '-'}
                        </div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <strong>{formatMoney(payment.amount)}</strong>
                    </CTableDataCell>
                  </CTableRow>
                ))
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-body-secondary">
                    No payment activity recorded.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </section>
      </DataTableDetailShell>
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
      <CModal
        visible={Boolean(actionContext)}
        onClose={() => !submitting && setActionContext(null)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader closeButton={!submitting}>
          <CModalTitle>
            {actionContext?.label} {record?.claimReference}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">
            {record?.staffName || 'Staff'} · {formatMoney(record?.claimsTotal || 0)} · revision{' '}
            {record?.revisionNo || 1}
          </p>
          <CFormLabel htmlFor="financialOtherClaimActionRemarks">
            Remarks{actionContext?.action === 'reject' ? ' (required)' : ' (optional)'}
          </CFormLabel>
          <CFormTextarea
            id="financialOtherClaimActionRemarks"
            rows={4}
            autoFocus
            value={remarks}
            aria-invalid={Boolean(actionError)}
            aria-describedby={actionError ? 'financialOtherClaimActionError' : undefined}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={submitting}
          />
          {actionError && (
            <div
              id="financialOtherClaimActionError"
              className="text-danger small mt-2"
              role="alert"
            >
              {actionError}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => setActionContext(null)}
          >
            Cancel
          </CButton>
          <CButton
            color={actionColor(actionContext?.action)}
            size="sm"
            disabled={submitting}
            onClick={submitAction}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-1" />
                Submitting...
              </>
            ) : (
              actionContext?.label
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FinancialOtherClaimRecordDetailPage
