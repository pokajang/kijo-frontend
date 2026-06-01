import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilExternalLink } from '@coreui/icons'
import { CAlert, CButton, CSpinner } from '@coreui/react'
import { DataTableDetailShell } from '../datatable'
import dialog from '../dialog/dialogService'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { formatMoney } from './salaryCalculations'
import { AttachmentPreviewModal } from './ApplySalary'
import { downloadSalaryClaims, downloadSalaryPayslip } from './SalaryRecord'
import { findSalaryRecordByUrlKey, removeSalaryRecord } from './salaryRecordStorage'
import { SalaryPayablePreviewTable } from './SalaryTables'
import { openPreparingPdfTab } from './salaryFileUtils'
import { getSalaryPayslipAvailability } from './salaryPayslipAvailability'

const mutableStatuses = new Set(['Draft', 'Submitted', 'Prepared', 'Rejected'])

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

const claimInlineMeta = (claim = {}, key = '') => {
  if (key === 'allowance') return ''

  return [claim.date, claim.meta || claim.sourceLabel].filter(Boolean).join(' - ')
}

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
          {claimInlineMeta(item, key) && (
            <span className="salary-preview-inline-note">{claimInlineMeta(item, key)}</span>
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
  const returnTo = location.state?.returnTo || '/my/salary/records'
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
  const statutoryEmployeeTotal = statutoryRows.reduce(
    (total, row) => total + Number(row.employee),
    0,
  )

  const summaryRows = useMemo(() => {
    const claims = record?.claims || []
    const allowanceClaims = sortAllowanceClaims(
      claims.filter((claim) => claim.type === 'Allowance'),
    )
    const expenseClaims = claims.filter((claim) => claim.type === 'Expense')
    const mileageClaims = claims.filter((claim) => claim.type === 'Mileage')
    const medicalClaims = claims.filter((claim) => claim.type === 'Medical')
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
        item: 'Claims Total',
        amount: claimsTotal,
      },
      ...buildClaimGroupRows({
        key: 'allowance',
        label: 'Allowance',
        total: sumClaims(claims, 'Allowance'),
        items: allowanceClaims,
        onPreviewAttachment: setPreviewAttachment,
      }),
      ...buildClaimGroupRows({
        key: 'expense',
        label: 'Expense',
        total: sumClaims(claims, 'Expense'),
        items: expenseClaims,
        onPreviewAttachment: setPreviewAttachment,
      }),
      ...buildClaimGroupRows({
        key: 'mileage',
        label: 'Mileage',
        total: sumClaims(claims, 'Mileage'),
        items: mileageClaims,
        onPreviewAttachment: setPreviewAttachment,
      }),
      ...buildClaimGroupRows({
        key: 'medical',
        label: 'Medical',
        total: sumClaims(claims, 'Medical'),
        items: medicalClaims,
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
    const canMutate = mutableStatuses.has(record?.status)
    const payslipAvailability = getSalaryPayslipAvailability(record)
    const exportingClaims = exportingPdfAction === 'claims'
    const exportingPayslip = exportingPdfAction === 'payslip'
    const isExportingPdf = Boolean(exportingPdfAction)

    return [
      {
        key: 'export-claims',
        label: exportingClaims ? 'Preparing PDF...' : 'Export Claims',
        buttonLabel: exportingClaims ? (
          <span className="d-inline-flex align-items-center gap-2">
            <CSpinner size="sm" />
            Preparing PDF...
          </span>
        ) : (
          'Export Claims'
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
        label: exportingPayslip ? 'Preparing PDF...' : 'Export Payslip',
        buttonLabel: exportingPayslip ? (
          <span className="d-inline-flex align-items-center gap-2">
            <CSpinner size="sm" />
            Preparing PDF...
          </span>
        ) : (
          'Export Payslip'
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
        label: 'Edit',
        hidden: !canMutate,
        onClick: (salaryRecord) =>
          navigate('/my/salary/apply', {
            state: { editRecord: salaryRecord },
          }),
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        hidden: !canMutate,
        onClick: async (salaryRecord) => {
          if (
            !(await dialog.confirm(`Delete ${salaryRecord.salaryMonth} salary application?`, {
              title: 'Delete Salary Record',
              confirmText: 'Delete',
              confirmColor: 'danger',
            }))
          )
            return

          try {
            await removeSalaryRecord(salaryRecord.id)
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
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={record}
      actions={record ? actions : []}
      emptyMessage="Salary record not found."
    >
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
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </DataTableDetailShell>
  )
}

export default SalaryRecordDetailPage
