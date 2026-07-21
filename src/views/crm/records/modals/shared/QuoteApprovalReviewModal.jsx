import React from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { quoteApiUrl } from '../../../quotes/quoteApi'

const money = (value) =>
  value == null
    ? '-'
    : `RM ${Number(value).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`

const QuoteApprovalReviewModal = ({
  visible,
  approval,
  remarks,
  onRemarksChange,
  onCancel,
  onDecision,
  isSubmitting = false,
}) => {
  const zone = String(approval?.zone || '').toLowerCase()
  const status = String(approval?.status || '').toLowerCase()
  const canDecide = status === 'pending' && Boolean(approval?.can_decide)
  const canPreview = status === 'approved' || canDecide
  const badgeColor = zone === 'red' ? 'danger' : zone === 'yellow' ? 'warning' : 'success'
  const previewUrl = approval
    ? `${quoteApiUrl(`quote-records/${approval.service}/${approval.quote_id}/pdf`)}?quote_id=${approval.quote_id}&approval_preview=1`
    : ''

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>Review Quotation Approval</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <strong>{approval?.quote_ref_no || '-'}</strong>
          <CBadge color={badgeColor}>{zone.toUpperCase()}</CBadge>
          <CBadge color="secondary">{String(approval?.required_step || '').toUpperCase()}</CBadge>
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
              {approval?.margin_percent == null
                ? 'Not available'
                : `${Number(approval.margin_percent).toFixed(2)}%`}
            </div>
          </div>
        </div>

        <CAlert color={badgeColor} className="py-2">
          <div className="fw-semibold mb-1">Why approval is required</div>
          <ul className="mb-0 ps-3">
            {(approval?.trigger_reasons || []).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </CAlert>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="small text-muted">
            Requested by {approval?.requested_by_name || 'quotation owner'}
          </div>
          {canPreview && (
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
            >
              {status === 'approved' ? 'Open Approved PDF' : 'Preview Draft PDF'}
            </CButton>
          )}
        </div>

        {canDecide ? (
          <>
            <CFormLabel htmlFor="quoteApprovalRemarks">Decision remarks</CFormLabel>
            <CFormTextarea
              id="quoteApprovalRemarks"
              rows={3}
              value={remarks}
              onChange={(event) => onRemarksChange(event.target.value)}
              placeholder="Optional for approval; required for rejection."
              disabled={isSubmitting}
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
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {canDecide ? 'Cancel' : 'Close'}
        </CButton>
        {canDecide && (
          <>
            <CButton
              color="danger"
              variant="outline"
              size="sm"
              onClick={() => onDecision('reject')}
              disabled={isSubmitting || !String(remarks || '').trim()}
            >
              Reject
            </CButton>
            <CButton
              color="success"
              size="sm"
              onClick={() => onDecision('approve')}
              disabled={isSubmitting}
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
