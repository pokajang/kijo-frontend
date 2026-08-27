import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilExternalLink } from '@coreui/icons'
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
import { DataTableDetailShell, DataTableStatusBadge } from '../datatable'
import dialog from '../dialog/dialogService'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { formatMoney } from './salaryCalculations'
import { AttachmentPreviewModal } from './claim-ui/ClaimFormPrimitives'
import { downloadSalaryClaims, downloadSalaryPayslip } from './SalaryRecord'
import { findSalaryRecordByUrlKey, removeSalaryRecord } from './salaryRecordStorage'
import { SalaryPayablePreviewTable } from './SalaryTables'
import { openPreparingPdfTab } from './salaryFileUtils'
import { getSalaryPayslipAvailability } from './salaryPayslipAvailability'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'

const reviewedMutableStatuses = new Set(['Checked', 'Approved'])
const paidStatuses = new Set(['Paid'])
const statusTone = {
  Draft: 'secondary',
  Submitted: 'info',
  Checked: 'primary',
  Approved: 'success',
  Returned: 'warning',
  Rejected: 'danger',
  Paid: 'success',
  Cancelled: 'warning',
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

const deductionRows = (record) => [
  {
    id: 'epf',
    item: 'EPF',
    employee: record?.deductions?.employeeEpf ?? record?.deductions?.epfEmployee ?? 0,
    employer: record?.deductions?.employerEpf ?? record?.deductions?.epfEmployer ?? 0,
  },
  {
    id: 'socso',
    item: 'SOCSO',
    employee: record?.deductions?.employeeSocso ?? record?.deductions?.socsoEmployee ?? 0,
    employer: record?.deductions?.employerSocso ?? record?.deductions?.socsoEmployer ?? 0,
  },
  {
    id: 'eis',
    item: 'EIS',
    employee: record?.deductions?.employeeEis ?? record?.deductions?.eisEmployee ?? 0,
    employer: record?.deductions?.employerEis ?? record?.deductions?.eisEmployer ?? 0,
  },
]

const AttachmentActions = ({ attachment, onPreviewAttachment }) => {
  if (!attachment) return '-'

  const attachmentName = attachment.name || attachment.originalName || 'attachment'

  return (
    <span className="salary-attachment-actions">
      <span className="salary-attachment-name">{attachmentName}</span>
      {(attachment.dataUrl || attachment.url || attachment.downloadUrl) && (
        <CButton
          color="secondary"
          variant="ghost"
          size="sm"
          className="salary-claim-icon-button"
          type="button"
          title="Open attachment"
          aria-label={`Open ${attachmentName}`}
          onClick={() => onPreviewAttachment?.(attachment)}
        >
          <CIcon icon={cilExternalLink} size="sm" />
        </CButton>
      )}
    </span>
  )
}

const sumClaims = (claims = [], type) =>
  claims
    .filter((claim) => claim.type === type)
    .reduce((total, claim) => total + Number(claim.amount || 0), 0)

const sortAllowanceClaims = (claims = []) => [
  ...claims.filter((claim) => claim.source === 'profile'),
  ...claims.filter((claim) => claim.source !== 'profile'),
]

const claimInlineMeta = (claim = {}) =>
  [claim.date, claim.meta || claim.sourceLabel].filter(Boolean).join(' - ')

const buildClaimGroupRows = ({ key, label, total, items, onPreviewAttachment }) => {
  if (Number(total || 0) <= 0 && !items.some((item) => Number(item.amount || 0) > 0)) return []

  return [
    {
      id: key,
      item: label,
      amount: total,
      isClaimGroup: true,
      isDetail: true,
    },
    ...items.map((item, index) => ({
      id: `${key}-${item.id || index}`,
      item: (
        <>
          {index + 1}. {item.description || label}
          {claimInlineMeta(item) && (
            <span className="salary-preview-inline-note">{claimInlineMeta(item)}</span>
          )}
          {item.attachment && (
            <AttachmentActions
              attachment={item.attachment}
              onPreviewAttachment={onPreviewAttachment}
            />
          )}
        </>
      ),
      amount: item.amount,
      isClaimItem: true,
      badge:
        key === 'allowance'
          ? {
              label: item.source === 'profile' ? 'Recurring' : 'Non-recurring',
              tone: item.source === 'profile' ? 'info' : 'secondary',
            }
          : null,
    })),
  ]
}

const SalaryRecordDetailPage = () => {
  const { salaryRecordId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getDetailReturnTo(location, '/my/salary/records')
  const [record, setRecord] = useState(location.state?.record || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportingPdfAction, setExportingPdfAction] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const { consumeEntity } = useAppNotifications()

  useEffect(() => {
    let isMounted = true

    setLoading(true)
    setError('')
    findSalaryRecordByUrlKey(salaryRecordId)
      .then((loadedRecord) => {
        if (!isMounted) return
        setRecord(loadedRecord)
        if (!loadedRecord) setError('Salary record not found.')
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err?.message || 'Unable to load salary details.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [salaryRecordId])

  useEffect(() => {
    const entityId = record?.id
    if (!entityId) return

    consumeEntity({
      moduleKey: 'my.salary',
      entityType: 'salary_application',
      entityId,
    }).catch(() => {})
  }, [consumeEntity, record?.id])

  const statutoryRows = useMemo(() => deductionRows(record), [record])
  const returnEvent = [...(record?.workflow?.history || [])]
    .reverse()
    .find((entry) => entry.action === 'return')
  const statutoryEmployeeTotal = statutoryRows.reduce(
    (total, row) => total + Number(row.employee),
    0,
  )

  const summaryRows = useMemo(() => {
    const claims = record?.claims || []
    const allowanceClaims = sortAllowanceClaims(
      claims.filter((claim) => claim.type === 'Allowance'),
    )
    const basicSalary = Number(record?.basicSalary || 0)
    const claimsTotal = Number(record?.claimsTotal || 0)

    return [
      {
        id: 'basic-salary',
        item: 'Basic Salary',
        amount: basicSalary,
      },
      {
        id: 'claims-total',
        item: 'Salary Adjustments',
        amount: claimsTotal,
      },
      ...buildClaimGroupRows({
        key: 'allowance',
        label: 'Allowance Adjustments',
        total: sumClaims(claims, 'Allowance'),
        items: allowanceClaims,
        onPreviewAttachment: setPreviewAttachment,
      }),
      {
        id: 'gross-salary',
        item: 'Gross Salary',
        amount: basicSalary + claimsTotal,
        isSubtotal: true,
      },
      {
        id: 'employee-deductions',
        item: 'Employee Deductions',
        amount: -Number(record?.employeeDeductions ?? statutoryEmployeeTotal),
        isGroup: true,
      },
      {
        id: 'employee-epf',
        item: 'EPF',
        amount: -Number(statutoryRows[0]?.employee || 0),
        isDetail: true,
      },
      {
        id: 'employee-socso',
        item: 'SOCSO',
        amount: -Number(statutoryRows[1]?.employee || 0),
        isDetail: true,
      },
      {
        id: 'employee-eis',
        item: 'EIS',
        amount: -Number(statutoryRows[2]?.employee || 0),
        isDetail: true,
      },
    ]
  }, [record, statutoryEmployeeTotal, statutoryRows])

  const actions = useMemo(() => {
    const isPaid = paidStatuses.has(record?.status)
    const isFinal = isPaid || record?.status === 'Rejected'
    const payslipAvailability = getSalaryPayslipAvailability(record)
    const exportingClaims = exportingPdfAction === 'claims'
    const exportingPayslip = exportingPdfAction === 'payslip'
    const isExportingPdf = Boolean(exportingPdfAction)

    return [
      {
        key: 'export-claims',
        label: exportingClaims ? 'Preparing PDF...' : 'Export Salary',
        buttonLabel: exportingClaims ? (
          <span className="d-inline-flex align-items-center gap-2">
            <CSpinner size="sm" />
            Preparing PDF...
          </span>
        ) : (
          'Export Salary'
        ),
        hidden: record?.status === 'Draft',
        disabled: isExportingPdf,
        onClick: async (salaryRecord) => {
          if (isExportingPdf) return

          setExportingPdfAction('claims')
          setExportError('')
          const pendingTab = openPreparingPdfTab('Preparing salary claim PDF...')
          try {
            await downloadSalaryClaims(salaryRecord, pendingTab)
          } catch (err) {
            if (pendingTab && !pendingTab.closed) pendingTab.close()
            setExportError(err?.message || 'Unable to export salary claims PDF.')
          } finally {
            setExportingPdfAction('')
          }
        },
      },
      {
        key: 'export-payslip',
        label: exportingPayslip ? 'Preparing PDF...' : 'Generate Payslip',
        buttonLabel: exportingPayslip ? (
          <span className="d-inline-flex align-items-center gap-2">
            <CSpinner size="sm" />
            Preparing PDF...
          </span>
        ) : (
          'Generate Payslip'
        ),
        disabled: isExportingPdf || !payslipAvailability.available,
        tooltip: payslipAvailability.available ? '' : payslipAvailability.tooltip,
        onClick: async (salaryRecord) => {
          if (isExportingPdf || !payslipAvailability.available) return

          setExportingPdfAction('payslip')
          setExportError('')
          const pendingTab = openPreparingPdfTab('Preparing salary payslip PDF...')
          try {
            await downloadSalaryPayslip(salaryRecord, pendingTab)
          } catch (err) {
            if (pendingTab && !pendingTab.closed) pendingTab.close()
            setExportError(err?.message || 'Unable to export salary payslip PDF.')
          } finally {
            setExportingPdfAction('')
          }
        },
      },
      {
        key: 'edit',
        label: record?.status === 'Returned' ? 'Edit & Resubmit' : 'Edit',
        disabled: isFinal,
        tooltip: isPaid
          ? 'Paid records cannot be changed.'
          : record?.status === 'Rejected'
            ? 'Rejected records have a final decision.'
            : '',
        onClick: async (salaryRecord) => {
          if (paidStatuses.has(salaryRecord?.status)) return
          let amendmentReason = ''
          if (reviewedMutableStatuses.has(salaryRecord.status)) {
            const reason = await dialog.prompt(
              `${salaryRecord.salaryMonth} has already been ${salaryRecord.status.toLowerCase()}. Enter a reason to restart the workflow.`,
              {
                title: 'Edit Reviewed Salary Record',
                confirmText: 'Continue',
                required: true,
                multiline: true,
                rows: 4,
                placeholder: 'Reason for amending this salary record',
              },
            )
            if (reason === null) return
            amendmentReason = String(reason || '').trim()
            if (!amendmentReason) return
          }
          navigate('/my/salary/apply', {
            state: { editRecord: salaryRecord, amendmentReason },
          })
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: isFinal,
        tooltip: isPaid
          ? 'Paid records cannot be changed.'
          : record?.status === 'Rejected'
            ? 'Rejected records have a final decision.'
            : '',
        onClick: async (salaryRecord) => {
          if (paidStatuses.has(salaryRecord?.status)) return
          let cancellationReason = ''
          if (reviewedMutableStatuses.has(salaryRecord.status)) {
            const reason = await dialog.prompt(
              `${salaryRecord.salaryMonth} has already been ${salaryRecord.status.toLowerCase()}. Enter a reason to cancel this salary record.`,
              {
                title: 'Cancel Reviewed Salary Record',
                confirmText: 'Cancel Record',
                confirmColor: 'danger',
                required: true,
                multiline: true,
                rows: 4,
                placeholder: 'Reason for cancelling this salary record',
              },
            )
            if (reason === null) return
            cancellationReason = String(reason || '').trim()
            if (!cancellationReason) return
          } else if (
            !(await dialog.confirm(`Delete ${salaryRecord.salaryMonth} salary application?`, {
              title: 'Delete Salary Record',
              confirmText: 'Delete',
              confirmColor: 'danger',
            }))
          ) {
            return
          }

          try {
            await removeSalaryRecord(salaryRecord.id, cancellationReason)
            navigate(returnTo)
          } catch (err) {
            setError(err?.message || 'Unable to delete salary record.')
          }
        },
      },
    ]
  }, [exportingPdfAction, navigate, record, returnTo])

  return (
    <DataTableDetailShell
      title="Salary Record Details"
      mobileFlat
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={record}
      actions={record ? actions : []}
      emptyMessage="Salary record not found."
    >
      <CAlert color={statusTone[record?.status] || 'secondary'} className="py-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <strong>{record?.salaryMonth || 'Salary record'}</strong>
          <span>Submitted {formatDateTime(record?.submittedAt)}</span>
          <DataTableStatusBadge tone={statusTone[record?.status] || 'secondary'}>
            {record?.status || '-'}
          </DataTableStatusBadge>
        </div>
      </CAlert>
      {record?.status === 'Rejected' && (record.checkedRemarks || record.approvedRemarks) && (
        <CAlert color="danger" className="py-2">
          <strong>Rejection reason:</strong> {record.approvedRemarks || record.checkedRemarks}
        </CAlert>
      )}
      {record?.status === 'Returned' && record.returnRemarks && (
        <CAlert color="warning" className="py-2">
          <strong>Changes requested:</strong> {record.returnRemarks}
          <div className="small mt-1">
            Returned from {record.returnedStage === 'approve' ? 'approval' : 'checking'}
            {returnEvent?.actorName || returnEvent?.actorCode
              ? ` by ${returnEvent.actorName || returnEvent.actorCode}`
              : ''}
            {record.returnedAt || returnEvent?.actedAt
              ? ` on ${formatDateTime(record.returnedAt || returnEvent.actedAt)}`
              : ''}
            .
          </div>
          <div className="small mt-1">
            Edit this salary request and resubmit it to restart checking.
          </div>
        </CAlert>
      )}
      {record?.cancelReason && (
        <CAlert color="warning" className="py-2">
          <strong>Cancellation reason:</strong> {record.cancelReason}
        </CAlert>
      )}
      {exportingPdfAction && (
        <CAlert color="info" className="py-2 d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          {exportingPdfAction === 'payslip'
            ? 'Preparing salary payslip PDF...'
            : 'Preparing salary claim PDF...'}
        </CAlert>
      )}
      {exportError && (
        <CAlert color="danger" className="py-2">
          {exportError}
        </CAlert>
      )}
      <section aria-label="Salary summary">
        <SalaryPayablePreviewTable rows={summaryRows} payableSalary={record?.payableSalary || 0} />
      </section>
      <section className="mt-4" aria-labelledby="salaryWorkflowHeading">
        <h3 className="salary-form-panel-heading mb-3" id="salaryWorkflowHeading">
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
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </DataTableDetailShell>
  )
}

export default SalaryRecordDetailPage
