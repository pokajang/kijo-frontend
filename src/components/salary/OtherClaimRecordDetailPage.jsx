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
import { downloadOtherClaim } from './OtherClaimRecords'
import { findOtherClaimRecordByUrlKey, removeOtherClaimRecord } from './otherClaimRecordStorage'
import { SalaryPayablePreviewTable } from './SalaryTables'
import { openPreparingPdfTab } from './salaryFileUtils'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'

const reviewedMutableStatuses = new Set(['Checked', 'Approved'])
const paidStatuses = new Set(['Paid'])

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

const claimReference = (claim = {}) =>
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
          {claimReference(item) && (
            <span className="salary-preview-inline-note">{claimReference(item)}</span>
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
    const claimsTotal = Number(record?.claimsTotal || 0)

    return [
      {
        id: 'claims-total',
        item: 'Claims Total',
        amount: claimsTotal,
        isSubtotal: true,
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
    ]
  }, [record])

  const actions = useMemo(() => {
    const isPaid = paidStatuses.has(record?.status)
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
        hidden: record?.status === 'Draft',
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
      {
        key: 'edit',
        label: 'Edit',
        disabled: isPaid,
        tooltip: isPaid ? 'Paid records cannot be changed.' : '',
        onClick: async (otherClaimRecord) => {
          if (paidStatuses.has(otherClaimRecord?.status)) return
          let amendmentReason = ''
          if (reviewedMutableStatuses.has(otherClaimRecord.status)) {
            const reason = await dialog.prompt(
              `This other claim has already been ${otherClaimRecord.status.toLowerCase()}. Enter a reason to restart the workflow.`,
              {
                title: 'Edit Reviewed Other Claim',
                confirmText: 'Continue',
                required: true,
                multiline: true,
                rows: 4,
                placeholder: 'Reason for amending this other claim',
              },
            )
            if (reason === null) return
            amendmentReason = String(reason || '').trim()
            if (!amendmentReason) return
          }
          navigate('/my/salary/other-claims/apply', {
            state: { editRecord: otherClaimRecord, amendmentReason },
          })
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: isPaid,
        tooltip: isPaid ? 'Paid records cannot be changed.' : '',
        onClick: async (otherClaimRecord) => {
          if (paidStatuses.has(otherClaimRecord?.status)) return
          let cancellationReason = ''
          if (reviewedMutableStatuses.has(otherClaimRecord.status)) {
            const reason = await dialog.prompt(
              `This other claim has already been ${otherClaimRecord.status.toLowerCase()}. Enter a reason to cancel it.`,
              {
                title: 'Cancel Reviewed Other Claim',
                confirmText: 'Cancel Claim',
                confirmColor: 'danger',
                required: true,
                multiline: true,
                rows: 4,
                placeholder: 'Reason for cancelling this other claim',
              },
            )
            if (reason === null) return
            cancellationReason = String(reason || '').trim()
            if (!cancellationReason) return
          } else if (
            !(await dialog.confirm('Delete this other claim?', {
              title: 'Delete Other Claim',
              confirmText: 'Delete',
              confirmColor: 'danger',
            }))
          ) {
            return
          }
          try {
            await removeOtherClaimRecord(otherClaimRecord.id, cancellationReason)
            navigate(returnTo)
          } catch (err) {
            setError(err?.message || 'Unable to delete other claim record.')
          }
        },
      },
    ]
  }, [exportingPdf, navigate, record?.status, returnTo])

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
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </DataTableDetailShell>
  )
}

export default OtherClaimRecordDetailPage
