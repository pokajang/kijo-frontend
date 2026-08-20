import React from 'react'
import { CBadge, CButton, CTableDataCell, CTooltip } from '@coreui/react'
import RemarksCell from '../shared/RemarksCell'
import { actionMenuPopperConfig } from '../shared/actionMenuPopperConfig'
import RecordActionMenu from '../shared/RecordActionMenu'
import QuoteApprovalBadge from '../shared/QuoteApprovalBadge'
import { getProjectOutcomeLabel, getStatusLabel } from '../../utils/allRecordsTableUtils'

export const formatServiceRecordAmount = (value) =>
  Number(value).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const getStatusTone = (status) => {
  if (status === 'Awarded') return 'success'
  if (status === 'Failed') return 'danger'
  if (status === 'Terminated') return 'dark'
  return 'info'
}

export const ServiceRecordIndexCell = ({ displayIndex }) => (
  <CTableDataCell className="text-center text-nowrap">{displayIndex}</CTableDataCell>
)

export const ServiceRecordIdCell = ({ record, columnWidths }) => (
  <CTableDataCell style={{ minWidth: columnWidths.id, whiteSpace: 'nowrap' }}>
    {record.quotationId}
    {record.revisionNo > 0 && (
      <span className="text-muted ms-1">
        <i>(Rev0{record.revisionNo})</i>
      </span>
    )}
  </CTableDataCell>
)

export const ServiceRecordClientCell = ({ record, columnWidths, truncateStyle }) => (
  <CTableDataCell style={{ minWidth: columnWidths.client }}>
    <div style={{ maxWidth: '210px' }}>
      <CTooltip content={record?.clientDetails?.companyName ?? '-'} placement="top">
        <span style={{ ...truncateStyle, maxWidth: '210px' }}>
          {record?.clientDetails?.companyName ?? '-'}
        </span>
      </CTooltip>
    </div>
  </CTableDataCell>
)

export const ServiceRecordEmailCell = ({
  record,
  columnWidths,
  truncateStyle,
  copiedEmail,
  onCopyEmail,
}) => (
  <CTableDataCell style={{ minWidth: columnWidths.email }}>
    {record?.clientDetails?.email ? (
      <CTooltip
        content={copiedEmail === record.clientDetails.email ? 'Copied!' : 'Click to copy'}
        placement="top"
      >
        <span
          data-no-row-open="true"
          onClick={(event) => {
            event.stopPropagation()
            onCopyEmail(record.clientDetails.email)
          }}
          style={{
            ...truncateStyle,
            maxWidth: '200px',
            cursor: 'pointer',
            color: 'var(--cui-primary)',
          }}
        >
          {record.clientDetails.email}
        </span>
      </CTooltip>
    ) : (
      '-'
    )}
  </CTableDataCell>
)

export const ServiceRecordSubjectCell = ({
  columnWidths,
  truncateStyle,
  subjectText,
  subjectTooltip,
  children,
}) => (
  <CTableDataCell style={{ minWidth: columnWidths.subject }}>
    {children ?? (
      <CTooltip content={subjectTooltip} placement="top">
        <span style={{ ...truncateStyle, maxWidth: '230px' }}>{subjectText}</span>
      </CTooltip>
    )}
  </CTableDataCell>
)

export const ServiceRecordAmountCell = ({ columnWidths, children, amountValue }) => (
  <CTableDataCell style={{ minWidth: columnWidths.amount }} className="text-center text-nowrap">
    {children ?? (amountValue != null ? formatServiceRecordAmount(amountValue) : '-')}
  </CTableDataCell>
)

export const ServiceRecordEstimatedCostCell = ({ columnWidths, children, estimatedCostValue }) => (
  <CTableDataCell
    style={{ minWidth: columnWidths.estimatedCost }}
    className="text-center text-nowrap"
  >
    {children ??
      (Number.isFinite(Number(estimatedCostValue))
        ? `RM ${formatServiceRecordAmount(estimatedCostValue)}`
        : '-')}
  </CTableDataCell>
)

export const ServiceRecordCreatedCell = ({ columnWidths, displayDate }) => (
  <CTableDataCell style={{ minWidth: columnWidths.created }} className="text-center text-nowrap">
    <span>{displayDate}</span>
  </CTableDataCell>
)

export const ServiceRecordAgeCell = ({ columnWidths, quotationAgeDays }) => (
  <CTableDataCell style={{ minWidth: columnWidths.age }} className="text-center text-nowrap">
    {quotationAgeDays != null ? (
      <span className={quotationAgeDays > 60 ? 'text-danger' : 'text-muted'}>
        {quotationAgeDays}d
      </span>
    ) : (
      '-'
    )}
  </CTableDataCell>
)

export const ServiceRecordPicCell = ({ record, columnWidths, truncateStyle }) => (
  <CTableDataCell style={{ minWidth: columnWidths.pic }}>
    <CTooltip
      content={record?.personInCharge || record?.clientDetails?.fullName || 'Unknown'}
      placement="top"
    >
      <span style={{ ...truncateStyle, maxWidth: '160px' }}>
        {record?.personInCharge || record?.clientDetails?.fullName || 'Unknown'}
      </span>
    </CTooltip>
  </CTableDataCell>
)

export const ServiceRecordStatusCell = ({ record, columnWidths }) => {
  const canReviewApproval = Boolean(
    record?.approval?.can_decide &&
      String(record.approval?.status || '').toLowerCase() === 'pending',
  )
  return (
    <CTableDataCell style={{ minWidth: columnWidths.status }} className="text-center text-nowrap">
      {canReviewApproval ? (
        <div className="d-inline-flex flex-column align-items-center gap-1">
          <CButton
            color="info"
            size="sm"
            variant="outline"
            className="py-0 px-2"
            data-no-row-open="true"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              window.dispatchEvent(
                new CustomEvent('quote-approval:review', { detail: record?.approval }),
              )
            }}
          >
            Review
          </CButton>
        </div>
      ) : (
        <div className="d-inline-flex flex-column align-items-center gap-1">
          <CBadge
            className={`records-status-badge records-status-badge--${getStatusTone(record.status)}`}
          >
            {getStatusLabel(record)}
          </CBadge>
          <QuoteApprovalBadge approval={record?.approval} />
          {getProjectOutcomeLabel(record) && (
            <span className="small text-muted">{getProjectOutcomeLabel(record)}</span>
          )}
        </div>
      )}
    </CTableDataCell>
  )
}

export const ServiceRecordRemarksCell = ({ record, columnWidths, fmtDate }) => (
  <CTableDataCell style={{ minWidth: columnWidths.remarks }}>
    <RemarksCell record={record} fmtDate={fmtDate} compact />
  </CTableDataCell>
)

export const ServiceRecordActionCell = ({
  record,
  columnWidths,
  actionCellStyle,
  onOpenTab,
  onGenerate,
  onFollowUp,
  onChangeToFail,
  onChangeToSuccess,
  onUnAward,
  onReAward,
  onEdit,
  onRevise,
  onNegotiate,
  onView,
  onEmail,
  onSharePdf,
  onSyncClientDetails,
  onDelete,
  actionKey,
  openActionKey,
  setOpenActionKey,
}) => (
  <CTableDataCell
    className="record-action-cell text-center"
    style={{ minWidth: columnWidths.action, ...actionCellStyle }}
    data-no-row-open="true"
    onClick={(event) => event.stopPropagation()}
  >
    <RecordActionMenu
      record={record}
      onGenerate={onGenerate}
      onFollowUp={onFollowUp}
      onChangeToFail={onChangeToFail ? (rec) => onChangeToFail(rec.id) : undefined}
      onChangeToSuccess={onChangeToSuccess ? (rec) => onChangeToSuccess(rec.id) : undefined}
      onUnAward={onUnAward ? (rec) => onUnAward(rec.id) : undefined}
      onReAward={onReAward ? (rec) => onReAward(rec.id) : undefined}
      onEdit={onEdit}
      onRevise={onRevise}
      onNegotiate={onNegotiate}
      onView={onView}
      onEmail={onEmail}
      onSharePdf={onSharePdf}
      onOpenTab={onOpenTab}
      onSyncClient={onSyncClientDetails}
      onDelete={onDelete ? (rec) => onDelete(rec.id) : undefined}
      popperConfig={actionMenuPopperConfig}
      actionKey={actionKey}
      openActionKey={openActionKey}
      setOpenActionKey={setOpenActionKey}
    />
  </CTableDataCell>
)
