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
import { formatMoney } from '../../../components/salary/salaryCalculations'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import { fetchFinancialSalaryRecord, submitFinancialSalaryAction } from './financialSalaryApi'

const statusTone = {
  Submitted: 'info',
  Checked: 'primary',
  Approved: 'success',
  Returned: 'warning',
  Rejected: 'danger',
  Paid: 'success',
}
const actionColor = (action) =>
  action === 'reject'
    ? 'danger'
    : action === 'return'
      ? 'warning'
      : action === 'approve'
        ? 'success'
        : 'info'
const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
}

const FinancialSalaryRecordDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getDetailReturnTo(location, '/financial/salary-records')
  const [record, setRecord] = useState(location.state?.record || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionContext, setActionContext] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [actionError, setActionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRecord(await fetchFinancialSalaryRecord(id))
    } catch (err) {
      setError(err?.message || 'Unable to load salary details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const canViewFinancialAmounts = record?.canViewFinancialAmounts !== false
  const amountValue = useCallback(
    (value, { negative = false, emphasis = false } = {}) => {
      if (!canViewFinancialAmounts) return 'Restricted'
      const formatted = `${negative ? '-' : ''}${formatMoney(value || 0)}`
      return emphasis ? <strong>{formatted}</strong> : formatted
    },
    [canViewFinancialAmounts],
  )

  const fields = useMemo(
    () => [
      { label: 'Staff', value: record?.staffName || record?.staffCode || '-' },
      { label: 'Salary month', value: record?.salaryMonth || '-' },
      { label: 'Submitted', value: formatDateTime(record?.submittedAt) },
      {
        label: 'Status',
        value: (
          <DataTableStatusBadge tone={statusTone[record?.status] || 'secondary'}>
            {record?.status || '-'}
          </DataTableStatusBadge>
        ),
      },
      { label: 'Basic salary', value: amountValue(record?.basicSalary) },
      { label: 'Adjustments', value: amountValue(record?.claimsTotal) },
      {
        label: 'Employee deductions',
        value: amountValue(record?.employeeDeductions, { negative: true }),
      },
      { label: 'Net pay', value: amountValue(record?.payableSalary, { emphasis: true }) },
    ],
    [record, amountValue],
  )

  const actions = (record?.workflow?.availableActions || []).map((action) => ({
    key: action.action,
    label: action.label,
    buttonColor: actionColor(action.action),
    onClick: () => {
      setActionContext(action)
      setRemarks('')
      setActionError('')
    },
  }))

  const submitAction = async () => {
    if (!record || !actionContext || submitting) return
    if (['reject', 'return'].includes(actionContext.action) && !remarks.trim()) {
      setActionError(
        actionContext.action === 'return'
          ? 'Describe the changes required before returning this salary record.'
          : 'Enter a reason before rejecting this salary record.',
      )
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await submitFinancialSalaryAction(
        record.id,
        actionContext.action,
        remarks,
        record.workflow?.instanceId,
        record.recordVersion,
      )
      setActionContext(null)
      await loadRecord()
    } catch (err) {
      setActionError(err?.message || 'Unable to update this salary record.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DataTableDetailShell
        title="Review Salary"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={record}
        actions={actions}
        emptyMessage="Salary record not found."
      >
        <DataTableDetailFields fields={fields} />
        {!canViewFinancialAmounts && (
          <CAlert color="info" className="mt-3 py-2">
            Salary and payment amounts are restricted to Finance, Account, and Bank roles.
          </CAlert>
        )}
        {record?.status === 'Rejected' && (record.checkedRemarks || record.approvedRemarks) && (
          <CAlert color="danger" className="mt-3 py-2">
            <strong>Rejection reason:</strong> {record.approvedRemarks || record.checkedRemarks}
          </CAlert>
        )}
        {record?.status === 'Returned' && record.returnRemarks && (
          <CAlert color="warning" className="mt-3 py-2">
            <strong>Changes requested:</strong> {record.returnRemarks}
          </CAlert>
        )}
        <section className="mt-4" aria-labelledby="financialSalaryClaims">
          <h3 className="h6 mb-2" id="financialSalaryClaims">
            Adjustments and evidence
          </h3>
          <CTable responsive small align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Item</CTableHeaderCell>
                <CTableHeaderCell>Date</CTableHeaderCell>
                <CTableHeaderCell>Evidence</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {(record?.claims || []).length ? (
                record.claims.map((claim) => (
                  <CTableRow key={claim.id}>
                    <CTableDataCell>
                      <strong>{claim.description || claim.type}</strong>
                      <div className="small text-body-secondary">
                        {claim.meta || claim.sourceLabel || '-'}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>{claim.date || '-'}</CTableDataCell>
                    <CTableDataCell>
                      {claim.attachment ? (
                        <CButton
                          size="sm"
                          color="secondary"
                          variant="outline"
                          onClick={() => setPreviewAttachment(claim.attachment)}
                        >
                          {claim.attachment.name}
                        </CButton>
                      ) : (
                        <span className="text-body-secondary">No evidence</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {amountValue(claim.amount)}
                    </CTableDataCell>
                  </CTableRow>
                ))
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-body-secondary">
                    No salary adjustments found.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </section>
        <section className="mt-4" aria-labelledby="financialSalaryWorkflow">
          <h3 className="h6 mb-2" id="financialSalaryWorkflow">
            Workflow history
          </h3>
          <CTable responsive small>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Action</CTableHeaderCell>
                <CTableHeaderCell>By</CTableHeaderCell>
                <CTableHeaderCell>When</CTableHeaderCell>
                <CTableHeaderCell>Remarks</CTableHeaderCell>
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
            {actionContext?.label} {record?.salaryMonth}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="small text-body-secondary">
            {record?.staffName || 'Staff'}
            {canViewFinancialAmounts ? ` · ${formatMoney(record?.payableSalary || 0)}` : ''}
          </p>
          {actionContext?.action === 'return' && (
            <CAlert color="warning" className="py-2">
              The applicant can edit this same request. After resubmission, it will restart at the
              checking stage.
            </CAlert>
          )}
          <CFormLabel htmlFor="financialSalaryActionRemarks">
            {actionContext?.action === 'return' ? 'Changes required' : 'Remarks'}
            {['reject', 'return'].includes(actionContext?.action) ? ' (required)' : ' (optional)'}
          </CFormLabel>
          <CFormTextarea
            id="financialSalaryActionRemarks"
            rows={4}
            autoFocus
            value={remarks}
            disabled={submitting}
            aria-invalid={Boolean(actionError)}
            placeholder={
              actionContext?.action === 'return'
                ? 'Explain exactly what the applicant needs to correct'
                : undefined
            }
            onChange={(event) => setRemarks(event.target.value)}
          />
          {actionError && (
            <div className="text-danger small mt-2" role="alert">
              {actionError}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={submitting}
            onClick={() => setActionContext(null)}
          >
            Cancel
          </CButton>
          <CButton
            size="sm"
            color={actionColor(actionContext?.action)}
            disabled={submitting}
            onClick={submitAction}
          >
            {submitting && <CSpinner size="sm" className="me-1" />}
            {actionContext?.label}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FinancialSalaryRecordDetailPage
