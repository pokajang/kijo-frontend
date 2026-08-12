import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilHistory, cilLink, cilPlus, cilUser, cilWarning } from '@coreui/icons'
import {
  formatFirstTouchDate,
  getFirstTouchEmploymentStatusLabel,
  getFirstTouchPersonCode,
  getFirstTouchPersonName,
  getFirstTouchSourceLabel,
} from '../clientFirstTouchUtils'
import FirstTouchStatusBadge from './FirstTouchStatusBadge'
import { FirstTouchEvidenceThumb } from './FirstTouchEvidencePreview'

const OriginField = ({ icon, label, children }) => (
  <div className="first-touch-origin-field">
    <CIcon icon={icon} aria-hidden="true" />
    <div>
      <div className="small text-muted">{label}</div>
      <div className="fw-medium">{children || '—'}</div>
    </div>
  </div>
)

const ClientOriginPanel = ({ firstTouch, onSubmit, onViewEvidence, onEdit, onDispute }) => {
  if (!firstTouch) {
    return (
      <CCard className="h-100 first-touch-origin-card">
        <CCardHeader>
          <strong>Current first touch</strong>
        </CCardHeader>
        <CCardBody className="d-flex flex-column justify-content-center">
          <div className="first-touch-empty-state first-touch-empty-state--origin">
            <span className="first-touch-empty-state__icon">
              <CIcon icon={cilWarning} size="xl" aria-hidden="true" />
            </span>
            <h2 className="h5 mt-3 mb-1">First touch has not been documented</h2>
            <p className="text-muted mb-3">
              Submit the earliest encounter supported by a screenshot or other image evidence. The
              first submission becomes current immediately.
            </p>
            {onSubmit ? (
              <CButton color="primary" onClick={onSubmit}>
                <CIcon icon={cilPlus} className="me-2" aria-hidden="true" />
                Submit evidence
              </CButton>
            ) : (
              <p className="small text-muted mb-0">
                You can view this client, but you do not have permission to submit evidence.
              </p>
            )}
          </div>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="h-100 first-touch-origin-card">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <strong>Current first touch</strong>
        <FirstTouchStatusBadge status={firstTouch.status} />
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          <CCol xs={12} lg={7}>
            <div className="d-grid gap-3">
              <OriginField icon={cilLink} label="Source">
                {getFirstTouchSourceLabel(firstTouch)}
              </OriginField>
              <OriginField icon={cilCalendar} label="Encounter date">
                {formatFirstTouchDate(firstTouch.occurredAt)}
                {firstTouch.occurredTime ? ` at ${firstTouch.occurredTime}` : ' · time unknown'}
              </OriginField>
              <OriginField icon={cilUser} label="Client contact">
                {firstTouch.clientContact}
              </OriginField>
              <OriginField icon={cilUser} label="Handled by or referred through">
                {getFirstTouchPersonName(firstTouch)}
                {getFirstTouchPersonCode(firstTouch)
                  ? ` (${getFirstTouchPersonCode(firstTouch)})`
                  : ''}
                {getFirstTouchEmploymentStatusLabel(firstTouch)
                  ? ` · ${getFirstTouchEmploymentStatusLabel(firstTouch)}`
                  : ''}
              </OriginField>
              <OriginField icon={cilLink} label="Linked inquiry">
                {firstTouch.inquiryRef || 'No linked inquiry'}
              </OriginField>
            </div>
          </CCol>
          <CCol xs={12} lg={5}>
            <FirstTouchEvidenceThumb
              proof={firstTouch.proofs?.[0]}
              proofCount={firstTouch.proofCount}
              onView={onViewEvidence}
            />
          </CCol>
          {firstTouch.notes ? (
            <CCol xs={12}>
              <div className="first-touch-origin-note">{firstTouch.notes}</div>
            </CCol>
          ) : null}
          {firstTouch.status === 'contested' ? (
            <CCol xs={12}>
              <div className="first-touch-origin-note">
                <div className="small fw-semibold text-body mb-1">Conflict in review</div>
                This remains the operational current claim while an independent reviewer compares
                the competing evidence or dispute. It is excluded from source aggregation meanwhile.
              </div>
            </CCol>
          ) : null}
        </CRow>
        <div className="first-touch-origin-audit">
          <div className="small text-muted">
            <CIcon icon={cilHistory} className="me-2" aria-hidden="true" />
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
            {onSubmit ? (
              <CButton color="secondary" variant="outline" size="sm" onClick={onSubmit}>
                Submit evidence
              </CButton>
            ) : null}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ClientOriginPanel
