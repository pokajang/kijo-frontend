import React from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CSpinner,
  CModalTitle,
} from '@coreui/react'
import { quoteApiUrl } from '../../../quotes/quoteApi'

const money = (value) => {
  if (value == null || String(value).trim() === '') return 'Not available'
  const amount = Number(value)
  return Number.isFinite(amount)
    ? `RM ${amount.toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Not available'
}

const percent = (value) => {
  if (value == null || String(value).trim() === '') return 'Not available'
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount.toFixed(2)}%` : 'Not available'
}

const cleanValue = (value) => {
  if (value == null) return ''
  const text = String(value).trim()
  return text.length ? text : ''
}

const readFirst = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = cleanValue(source?.[key])
    if (value) return value
  }
  return ''
}

const formatDate = (value) => {
  const text = cleanValue(value)
  if (!text) return '-'
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  return parsed.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

const truncate = (value, maxLength) => {
  const text = cleanValue(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`
}

const QuoteApprovalReviewModal = ({
  visible,
  approval,
  decisionNotice,
  remarks,
  queuePosition = 1,
  queueSize = 1,
  queueItems = [],
  canNavigateNext = false,
  canNavigatePrevious = false,
  onQueueNext = () => {},
  onQueuePrevious = () => {},
  onQueueSkip = () => {},
  onQueueJump = () => {},
  onRemarksChange,
  onCancel,
  onDecision,
  isSubmitting = false,
  isLoading = false,
}) => {
  const zone = String(approval?.zone || '').toLowerCase()
  const status = String(approval?.status || '').toLowerCase()
  const isStaleNotice =
    Boolean(decisionNotice) && status === 'pending' && Boolean(approval?.can_decide)
  const canDecide = status === 'pending' && Boolean(approval?.can_decide) && !isStaleNotice
  const canPreview = status === 'approved' || canDecide
  const isBusy = isSubmitting || isLoading
  const badgeColor = zone === 'red' ? 'danger' : zone === 'yellow' ? 'warning' : 'success'
  const previewUrl = approval
    ? `${quoteApiUrl(`quote-records/${approval.service}/${approval.quote_id}/pdf`)}?quote_id=${approval.quote_id}&approval_preview=1`
    : ''
  const staleMessage =
    decisionNotice?.message || (decisionNotice?.title ? `${decisionNotice.title}` : null)
  const isQueueMode = Number(queueSize) > 1
  const missingMetadataFields = Array.isArray(approval?.review_metadata_missing_fields)
    ? approval.review_metadata_missing_fields
    : []
  const normalizedQueuePosition = Number(queuePosition) > 0 ? Number(queuePosition) : 1
  const normalizedQueueSize = Number(queueSize) > 0 ? Number(queueSize) : 1
  const quoteRefNo =
    readFirst(approval, [
      'quote_ref_no',
      'quoteRefNo',
      'quoteRef',
      'quoteNumber',
      'quote_number',
      'quotationNumber',
      'quotation_number',
      'quote_ref',
      'quotationId',
      'quoteNo',
      'quote_no',
      'quotation_no',
      'quotationNo',
      'reference',
      'refNo',
      'ref_no',
    ]) || (approval?.quote_id != null ? `Quote #${approval.quote_id}` : '-')
  const quoteTitle = readFirst(approval, [
    'quote_title',
    'quotation_title',
    'quoteTitle',
    'quote_name',
    'title',
    'name',
  ])
  const quoteDate = readFirst(approval, [
    'quote_date',
    'quotation_date',
    'quoteDate',
    'dateCreated',
    'createdAt',
    'date_created',
    'date',
    'created_at',
    'updated_at',
  ])
  const formattedQuoteDate = formatDate(quoteDate)
  const clientName =
    readFirst(approval, [
      'client_name',
      'clientName',
      'fullName',
      'customerName',
      'customer_name',
      'company_name',
      'companyName',
    ]) ||
    approval?.clientDetails?.companyName ||
    approval?.clientDetails?.name
  const normalizedQueueItems = Array.isArray(queueItems) ? queueItems : []
  const fallbackQueueItems =
    normalizedQueueItems.length > 0
      ? normalizedQueueItems
      : Array.from({ length: normalizedQueueSize }, (_, index) => ({
          id: approval?.id != null ? `fallback-${approval.id}-${index}` : `fallback-${index}`,
          index,
          quoteRefNo:
            quoteRefNo === '-' ? (approval?.quote_id != null ? `#${index + 1}` : '-') : quoteRefNo,
          quoteTitle,
          quoteDate,
          clientName,
        }))
  const queueSelectItems = fallbackQueueItems.map((item, index) => ({
    ...item,
    index: typeof item.index === 'number' ? item.index : index,
  }))
  const activeQueueIndex = Math.min(
    Math.max(normalizedQueuePosition - 1, 0),
    Math.max(queueSelectItems.length - 1, 0),
  )

  const showQueueActions = isQueueMode && canDecide
  const isNextQueueAvailable = Boolean(canNavigateNext) && !isBusy
  const isPrevQueueAvailable = Boolean(canNavigatePrevious) && !isBusy
  const queueItemFullLabel = (item) => {
    const quoteReference = cleanValue(item?.quoteRefNo)
    const client = cleanValue(
      item?.clientName ||
        item?.client_name ||
        item?.company_name ||
        item?.companyName ||
        item?.customer_name ||
        item?.customerName ||
        item?.fullName,
    )
    return [quoteReference, client].filter(Boolean).join(' — ')
  }

  const queueItemLabel = (item) => {
    const quoteReference = cleanValue(item?.quoteRefNo)
    const client = truncate(
      item?.clientName ||
        item?.client_name ||
        item?.company_name ||
        item?.companyName ||
        item?.customer_name ||
        item?.customerName ||
        item?.fullName,
      48,
    )
    return [quoteReference, client].filter(Boolean).join(' — ')
  }

  const handleQueueJump = (event) => {
    const targetValue = event?.target?.value
    onQueueJump(targetValue)
  }

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>Review Quotation Approval</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isQueueMode && (
          <div className="border rounded p-2 mb-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="small text-muted text-nowrap">
                Reviewing {normalizedQueuePosition} of {normalizedQueueSize}
              </div>
              {showQueueActions && (
                <div className="d-flex flex-wrap align-items-center gap-1 flex-shrink-0">
                  <CButton
                    color="info"
                    variant="outline"
                    size="sm"
                    className="py-0 px-2"
                    onClick={onQueuePrevious}
                    disabled={isBusy || !isPrevQueueAvailable}
                  >
                    Previous
                  </CButton>
                  <CButton
                    color="warning"
                    variant="outline"
                    size="sm"
                    className="py-0 px-2"
                    onClick={onQueueSkip}
                    disabled={isBusy || !isNextQueueAvailable}
                  >
                    Skip
                  </CButton>
                  <CButton
                    color="info"
                    variant="outline"
                    size="sm"
                    className="py-0 px-2"
                    onClick={onQueueNext}
                    disabled={isBusy || !isNextQueueAvailable}
                  >
                    Next
                  </CButton>
                </div>
              )}
              <div className="flex-grow-1" style={{ flexBasis: '220px', minWidth: 0 }}>
                <CFormSelect
                  id="quoteApprovalQueueJump"
                  aria-label="Jump to quotation"
                  size="sm"
                  className="w-100"
                  value={String(activeQueueIndex)}
                  onChange={handleQueueJump}
                  disabled={isBusy || queueSelectItems.length <= 1}
                  title={queueItemFullLabel(queueSelectItems[activeQueueIndex])}
                  style={{ maxWidth: '100%', minWidth: 0 }}
                >
                  {queueSelectItems.map((item) => (
                    <option key={`${item.id}-${item.index ?? ''}`} value={String(item.index)}>
                      {queueItemLabel(item)}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </div>
          </div>
        )}
        <div className="mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <strong>{quoteRefNo}</strong>
            <CBadge color={badgeColor}>{zone.toUpperCase()}</CBadge>
            <CBadge color="secondary">{String(approval?.required_step || '').toUpperCase()}</CBadge>
          </div>
          <div className="row g-2 mt-1">
            <div className="col-sm-6 col-lg-4">
              <div className="small text-muted">Quotation title</div>
              <div className="fw-semibold">{quoteTitle || '-'}</div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="small text-muted">Quotation date</div>
              <div className="fw-semibold">{formattedQuoteDate}</div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="small text-muted">Client</div>
              <div className="fw-semibold">{clientName || '-'}</div>
            </div>
          </div>
        </div>
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-lg-3">
            <div className="small text-muted">Service</div>
            <div className="fw-semibold text-capitalize">{approval?.service || '-'}</div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="small text-muted">Quoted total</div>
            <div className="fw-semibold">{money(approval?.quoted_total)}</div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="small text-muted">Estimated cost</div>
            <div className="fw-semibold">{money(approval?.estimated_cost)}</div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="small text-muted">Markup on cost</div>
            <div className="fw-semibold">
              {percent(approval?.margin_percent)}
              {approval?.review_metadata_margin_calculated && (
                <span className="d-block small text-muted fw-normal">
                  Calculated from quoted total and cost
                </span>
              )}
            </div>
          </div>
        </div>

        {missingMetadataFields.length > 0 && (
          <CAlert color="warning" className="py-2">
            <div className="fw-semibold mb-1">Some quotation details could not be loaded</div>
            Missing: {missingMetadataFields.join(', ')}. Preview the quotation before making a
            decision.
          </CAlert>
        )}

        <CAlert color={badgeColor} className="py-2">
          <div className="fw-semibold mb-1">Why approval is required</div>
          <ul className="mb-0 ps-3">
            {(approval?.trigger_reasons || []).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </CAlert>

        {isStaleNotice && (
          <CAlert color="warning" className="py-2">
            <div className="fw-semibold mb-1">
              {decisionNotice?.title || 'Approval request is outdated'}
            </div>
            {staleMessage}
          </CAlert>
        )}

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="small text-muted">
            Requested by {approval?.requested_by_name || 'quotation owner'}
          </div>
          {canPreview && (
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              disabled={isBusy}
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
            >
              {status === 'approved' ? 'Open Approved PDF' : 'Preview Draft PDF'}
            </CButton>
          )}
        </div>
        {isLoading && (
          <CAlert color="info" className="mb-3 py-2">
            <div className="d-flex align-items-center gap-2">
              <CSpinner size="sm" />
              <span>Loading quotation details...</span>
            </div>
          </CAlert>
        )}

        {canDecide ? (
          <>
            <CFormLabel htmlFor="quoteApprovalRemarks">Decision remarks</CFormLabel>
            <CFormTextarea
              id="quoteApprovalRemarks"
              rows={3}
              value={remarks}
              onChange={(event) => onRemarksChange(event.target.value)}
              placeholder="Optional for approval; required for rejection."
              disabled={isBusy}
            />
          </>
        ) : (
          <CAlert
            color={status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'info'}
            className="mb-0 py-2"
          >
            <strong className="text-capitalize">{status || 'Unavailable'}</strong>
            {approval?.decided_by_name ? ` by ${approval.decided_by_name}` : ''}
            {approval?.decision_remarks ? ` - ${approval.decision_remarks}` : ''}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
          {canDecide && isQueueMode ? 'Stop review' : canDecide ? 'Cancel' : 'Close'}
        </CButton>
        {canDecide && (
          <>
            <CButton
              color="danger"
              variant="outline"
              size="sm"
              onClick={() => onDecision('reject')}
              disabled={isBusy || !String(remarks || '').trim()}
            >
              Reject
            </CButton>
            <CButton
              color="success"
              size="sm"
              onClick={() => onDecision('approve')}
              disabled={isBusy}
            >
              {isSubmitting ? 'Saving...' : 'Approve'}
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default QuoteApprovalReviewModal
