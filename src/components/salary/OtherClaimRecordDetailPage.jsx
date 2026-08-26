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
import OtherClaimAuditTrail from './OtherClaimAuditTrail'
import { downloadOtherClaim } from './OtherClaimRecords'
import { getClaimAttachments } from './other-claim/model/otherClaimModel'
import {
  archiveOtherClaimRecord,
  deleteOtherClaimRecord,
  findOtherClaimRecordByUrlKey,
  withdrawOtherClaimRecord,
} from './otherClaimRecordStorage'
import { SalaryPayablePreviewTable } from './SalaryTables'
import { openPreparingPdfTab } from './salaryFileUtils'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'

const statusTone = {
  Submitted: 'info',
  Checked: 'primary',
  Approved: 'success',
  Paid: 'success',
  Rejected: 'danger',
  Cancelled: 'warning',
}

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

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
}

const claimReference = (claim = {}) =>
  [
    claim.date,
    claim.startLocation || claim.endLocation
      ? `${claim.startLocation || '-'} to ${claim.endLocation || '-'}`
      : '',
    claim.meta,
    claim.mileageRate ? `${formatMoney(claim.mileageRate)} per KM` : '',
    claim.sourceLabel ? `Charge to: ${claim.sourceLabel}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

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
          {claimReference(item) && (
            <span className="salary-preview-inline-note">{claimReference(item)}</span>
          )}
          {getClaimAttachments(item).map((attachment) => (
            <AttachmentActions
              key={attachment.id || attachment.clientId || attachment.name}
              attachment={attachment}
              onPreviewAttachment={onPreviewAttachment}
            />
          ))}
        </>
      ),
      amount: item.amount,
      isClaimItem: true,
    })),
  ]
}

const OtherClaimRecordDetailPage = () => {
  const { otherClaimRecordId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getDetailReturnTo(location, '/my/salary/other-claims/records')
  const [record, setRecord] = useState(location.state?.record || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const { consumeEntity } = useAppNotifications()

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError('')
    findOtherClaimRecordByUrlKey(otherClaimRecordId)
      .then((loadedRecord) => {
        if (!isMounted) return
        setRecord(loadedRecord)
        if (!loadedRecord) setError('Other claim record not found.')
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || 'Unable to load other claim details.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [otherClaimRecordId])

  useEffect(() => {
    const entityId = record?.id
    if (!entityId) return

    consumeEntity({
      moduleKey: 'my.other-claims',
      entityType: 'other_claim_application',
      entityId,
    }).catch(() => {})
  }, [consumeEntity, record?.id])

  const summaryRows = useMemo(() => {
    const claims = record?.claims || []
    const allowanceClaims = claims.filter((claim) => claim.type === 'Allowance')
    const expenseClaims = claims.filter((claim) => claim.type === 'Expense')
    const mileageClaims = claims.filter((claim) => claim.type === 'Mileage')
    const medicalClaims = claims.filter((claim) => claim.type === 'Medical')
    return [
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
    ]
  }, [record])

  const actions = useMemo(() => {
    const canRevise = record?.status === 'Rejected'
    const canEditDraft = record?.status === 'Draft'
    const canEditSubmitted = ['Submitted', 'Prepared'].includes(record?.status)
    const canWithdraw = ['Submitted', 'Prepared', 'Checked', 'Approved', 'Rejected'].includes(
      record?.status,
    )
    const canArchive = record?.status === 'Cancelled' && !record?.archivedAt
    const canHardDelete = ['Draft', 'Cancelled'].includes(record?.status)
    return [
      {
        key: 'export-claims',
        label: exportingPdf ? 'Preparing PDF...' : 'Export Claims',
        buttonLabel: exportingPdf ? (
          <span className="d-inline-flex align-items-center gap-2">
            <CSpinner size="sm" />
            Preparing PDF...
          </span>
        ) : (
          'Export Claims'
        ),
        hidden: ['Draft', 'Cancelled'].includes(record?.status),
        disabled: exportingPdf,
        onClick: async (otherClaimRecord) => {
          if (exportingPdf) return

          setExportingPdf(true)
          setExportError('')
          const pendingTab = openPreparingPdfTab('Preparing other claim PDF...')
          try {
            await downloadOtherClaim(otherClaimRecord, pendingTab)
          } catch (err) {
            if (pendingTab && !pendingTab.closed) pendingTab.close()
            setExportError(err?.message || 'Unable to export other claim PDF.')
          } finally {
            setExportingPdf(false)
          }
        },
      },
      canEditDraft || canEditSubmitted || canRevise
        ? {
            key: 'edit',
            label: canRevise ? 'Create Revision' : canEditDraft ? 'Edit Draft' : 'Edit Claim',
            onClick: async (otherClaimRecord) => {
              let amendmentReason = ''
              if (otherClaimRecord.status === 'Rejected') {
                const reason = await dialog.prompt(
                  'Enter a reason for revising this rejected other claim. The original claim will remain in the audit history.',
                  {
                    title: 'Create Other Claim Revision',
                    confirmText: 'Create Revision',
                    required: true,
                    multiline: true,
                    rows: 4,
                    placeholder: 'Reason for amending this other claim',
                  },
                )
                if (reason === null) return
                amendmentReason = String(reason || '').trim()
                if (!amendmentReason) return
              } else if (['Submitted', 'Prepared'].includes(otherClaimRecord.status)) {
                const confirmed = await dialog.confirm(
                  'Editing this claim will restart its review. The claim will need to be submitted again after your changes.',
                  {
                    title: 'Edit and resubmit other claim',
                    confirmText: 'Edit Claim',
                  },
                )
                if (!confirmed) return
              }
              navigate('/my/salary/other-claims/apply', {
                state: { editRecord: otherClaimRecord, amendmentReason },
              })
            },
          }
        : null,
      canWithdraw
        ? {
            key: 'withdraw',
            label: 'Withdraw Claim',
            danger: true,
            onClick: async (otherClaimRecord) => {
              const reason = await dialog.prompt(
                'This will withdraw the claim from review and retain its audit history.',
                {
                  title: 'Withdraw Other Claim',
                  confirmText: 'Withdraw Claim',
                  confirmColor: 'danger',
                  required: true,
                  multiline: true,
                  rows: 4,
                  placeholder: 'Reason for withdrawing this claim',
                },
              )
              if (reason === null || !String(reason).trim()) return
              try {
                await withdrawOtherClaimRecord(
                  otherClaimRecord.id,
                  String(reason).trim(),
                  otherClaimRecord.recordVersion,
                )
                navigate(returnTo)
              } catch (err) {
                setError(err?.message || 'Unable to withdraw other claim record.')
              }
            },
          }
        : null,
      canArchive
        ? {
            key: 'archive',
            label: 'Archive Withdrawn Claim',
            danger: true,
            onClick: async (otherClaimRecord) => {
              const reason = await dialog.prompt(
                'This hides the withdrawn claim from your current records. Its claim items and audit history remain available to authorized administrators.',
                {
                  title: 'Archive Withdrawn Claim',
                  confirmText: 'Archive Claim',
                  confirmColor: 'danger',
                  multiline: true,
                  rows: 3,
                  placeholder: 'Optional archive note',
                },
              )
              if (reason === null) return
              try {
                await archiveOtherClaimRecord(
                  otherClaimRecord.id,
                  String(reason).trim(),
                  otherClaimRecord.recordVersion,
                )
                navigate(returnTo)
              } catch (err) {
                setError(err?.message || 'Unable to archive withdrawn other claim.')
              }
            },
          }
        : null,
      canHardDelete
        ? {
            key: 'delete-permanently',
            label: 'Delete Permanently',
            danger: true,
            onClick: async (otherClaimRecord) => {
              const confirmation = await dialog.prompt(
                `You are about to permanently delete this ${otherClaimRecord.status === 'Draft' ? 'draft' : 'withdrawn'} claim. This cannot be undone: its claim items, uploads, workflow, notifications, and audit history will be removed. Type DELETE to continue.`,
                {
                  title: 'Delete Other Claim Permanently',
                  confirmText: 'Delete Permanently',
                  confirmColor: 'danger',
                  required: true,
                  placeholder: 'Type DELETE',
                },
              )
              if (confirmation === null) return
              if (String(confirmation).trim() !== 'DELETE') {
                setError('Type DELETE exactly to permanently delete this other claim.')
                return
              }
              try {
                await deleteOtherClaimRecord(otherClaimRecord.id, otherClaimRecord.recordVersion)
                navigate(returnTo)
              } catch (err) {
                setError(err?.message || 'Unable to permanently delete other claim.')
              }
            },
          }
        : null,
    ].filter(Boolean)
  }, [exportingPdf, navigate, record?.archivedAt, record?.status, returnTo])

  return (
    <DataTableDetailShell
      title="Other Claim Details"
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={record}
      actions={record ? actions : []}
      emptyMessage="Other claim record not found."
    >
      <CAlert color={statusTone[record?.status] || 'secondary'} className="py-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <strong>{record?.claimReference || '-'}</strong>
          <span>Revision {record?.revisionNo || 1}</span>
          <span>Submitted {formatDateTime(record?.submittedAt)}</span>
          <DataTableStatusBadge tone={statusTone[record?.status] || 'secondary'}>
            {record?.status === 'Cancelled' ? 'Withdrawn' : record?.status || '-'}
          </DataTableStatusBadge>
        </div>
      </CAlert>
      {record?.status === 'Rejected' && (record.checkedRemarks || record.approvedRemarks) && (
        <CAlert color="danger" className="py-2">
          <strong>Rejection reason:</strong> {record.approvedRemarks || record.checkedRemarks}
        </CAlert>
      )}
      {record?.status === 'Cancelled' && record?.cancelReason && (
        <CAlert color="warning" className="py-2">
          <strong>Withdrawal reason:</strong> {record.cancelReason}
        </CAlert>
      )}
      {record?.archivedAt && (
        <CAlert color="secondary" className="py-2">
          <strong>Archived:</strong> {formatDateTime(record.archivedAt)}
          {record.archiveReason ? ` — ${record.archiveReason}` : ''}
        </CAlert>
      )}
      {exportingPdf && (
        <CAlert color="info" className="py-2 d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          Preparing other claim PDF...
        </CAlert>
      )}
      {exportError && (
        <CAlert color="danger" className="py-2">
          {exportError}
        </CAlert>
      )}
      <section aria-labelledby="otherClaimSummaryHeading">
        <h3 className="salary-form-panel-heading mb-3" id="otherClaimSummaryHeading">
          Other Claim Summary
        </h3>
        <SalaryPayablePreviewTable
          rows={summaryRows}
          payableSalary={record?.claimsTotal || 0}
          footerRows={[
            {
              key: 'total-claim',
              className: 'salary-payable-preview-footer-row',
              cells: [
                { key: 'item', content: <strong>Total Claim</strong> },
                {
                  key: 'amount',
                  align: 'right',
                  content: <strong>{formatMoney(record?.claimsTotal || 0)}</strong>,
                },
              ],
            },
          ]}
        />
      </section>
      <section className="mt-4" aria-labelledby="otherClaimWorkflowHeading">
        <h3 className="salary-form-panel-heading mb-3" id="otherClaimWorkflowHeading">
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
        id="otherClaimAuditHeading"
      />
      <section className="mt-4" aria-labelledby="otherClaimPaymentHeading">
        <h3 className="salary-form-panel-heading mb-3" id="otherClaimPaymentHeading">
          Payment history
        </h3>
        <CTable responsive small>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell scope="col">Status</CTableHeaderCell>
              <CTableHeaderCell scope="col">Payment date</CTableHeaderCell>
              <CTableHeaderCell scope="col">Reference</CTableHeaderCell>
              <CTableHeaderCell scope="col">Method</CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-end">
                Amount
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {(record?.paymentHistory || []).length ? (
              record.paymentHistory.map((payment) => (
                <CTableRow key={payment.id}>
                  <CTableDataCell>
                    {payment.status}
                    {payment.reversalReason && (
                      <div className="small text-body-secondary">{payment.reversalReason}</div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>{payment.paymentDate || '-'}</CTableDataCell>
                  <CTableDataCell>{payment.paymentReference || '-'}</CTableDataCell>
                  <CTableDataCell>{payment.paymentMethod || '-'}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    <strong>{formatMoney(payment.amount)}</strong>
                  </CTableDataCell>
                </CTableRow>
              ))
            ) : (
              <CTableRow>
                <CTableDataCell colSpan={5} className="text-center text-body-secondary">
                  No payment has been recorded for this claim.
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

export default OtherClaimRecordDetailPage
