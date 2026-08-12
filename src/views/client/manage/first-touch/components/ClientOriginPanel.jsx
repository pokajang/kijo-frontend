import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import {
  formatFirstTouchDate,
  getFirstTouchPersonCode,
  getFirstTouchPersonName,
  getFirstTouchSourceLabel,
  getFirstTouchWorkflowSummary,
} from '../clientFirstTouchUtils'
import { FirstTouchEvidenceThumb } from './FirstTouchEvidencePreview'

const OriginField = ({ label, children }) => (
  <div className="first-touch-origin-field">
    <div className="small text-muted">{label}</div>
    <div className="fw-medium">{children || '—'}</div>
  </div>
)

const ClientOriginPanel = ({
  firstTouch,
  record,
  onViewEvidence,
  onEdit,
  onDispute,
  onReviewConflict,
  isClarificationRecipient = false,
}) => {
  if (!firstTouch) {
    return (
      <CCard>
        <CCardHeader>
          <strong>Current first touch</strong>
        </CCardHeader>
        <CCardBody className="text-muted">No first-touch evidence recorded.</CCardBody>
      </CCard>
    )
  }

  const personName = getFirstTouchPersonName(firstTouch)
  const personCode = getFirstTouchPersonCode(firstTouch)
  const personLabel = [personName, personCode ? `(${personCode})` : ''].filter(Boolean).join(' ')
  const workflow = getFirstTouchWorkflowSummary(record || { firstTouch }, {
    canReviewConflict: Boolean(onReviewConflict),
    isClarificationRecipient,
  })

  return (
    <CCard>
      <CCardHeader>
        <strong>Current first touch</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          <CCol xs={12} lg={8}>
            <CRow className="g-3">
              <CCol xs={12} md={6}>
                <OriginField label="Source">{getFirstTouchSourceLabel(firstTouch)}</OriginField>
              </CCol>
              <CCol xs={12} md={6}>
                <OriginField label="Encounter date">
                  {formatFirstTouchDate(firstTouch.occurredAt)}
                  {firstTouch.occurredTime ? ` at ${firstTouch.occurredTime}` : ''}
                </OriginField>
              </CCol>
              <CCol xs={12} md={6}>
                <OriginField label="Client contact">{firstTouch.clientContact}</OriginField>
              </CCol>
              <CCol xs={12} md={6}>
                <OriginField label="Handled by or referred through">{personLabel}</OriginField>
              </CCol>
              <CCol xs={12} md={6}>
                <OriginField label="Linked inquiry">{firstTouch.inquiryRef}</OriginField>
              </CCol>
            </CRow>
          </CCol>
          <CCol xs={12} lg={4}>
            <FirstTouchEvidenceThumb
              proof={firstTouch.proofs?.[0]}
              proofCount={firstTouch.proofCount}
              onView={onViewEvidence}
            />
          </CCol>
          {firstTouch.notes ? (
            <CCol xs={12}>
              <OriginField label="Remarks">{firstTouch.notes}</OriginField>
            </CCol>
          ) : null}
          {record?.conflict?.status === 'clarification_requested' ||
          firstTouch.status === 'contested' ? (
            <CCol xs={12}>
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="small text-muted">
                  <div>{workflow.label}.</div>
                  {workflow.detail ? <div>{workflow.detail}</div> : null}
                </div>
                {onReviewConflict ? (
                  <CButton color="warning" variant="outline" size="sm" onClick={onReviewConflict}>
                    Review conflict
                  </CButton>
                ) : null}
              </div>
            </CCol>
          ) : null}
        </CRow>
        <div className="first-touch-origin-audit">
          <div className="small text-muted">
            Recorded by {firstTouch.submittedBy || 'Staff'} ·{' '}
            {formatFirstTouchDate(firstTouch.submittedAt)}
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {onEdit ? (
              <CButton color="secondary" variant="outline" size="sm" onClick={onEdit}>
                Edit evidence
              </CButton>
            ) : null}
            {onDispute ? (
              <CButton color="danger" variant="outline" size="sm" onClick={onDispute}>
                Dispute evidence
              </CButton>
            ) : null}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ClientOriginPanel
