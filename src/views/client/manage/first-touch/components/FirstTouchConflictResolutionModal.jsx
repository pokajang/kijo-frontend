import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { formatFirstTouchDate, getFirstTouchSourceLabel } from '../clientFirstTouchUtils'
import EvidenceCard from './FirstTouchEvidencePreview'
import FirstTouchReviewSupplementalEvidence from './FirstTouchReviewSupplementalEvidence'

const resolutionOptions = [
  {
    value: 'uphold_current',
    label: 'Uphold current claim',
    description: 'Keep the current first touch and reject the competing claims.',
  },
  {
    value: 'accept_competing',
    label: 'Accept selected competing claim',
    description: 'Replace the current first touch with the selected earlier claim.',
  },
  {
    value: 'clarification_requested',
    label: 'Request clarification',
    description: 'Keep the conflict open while a named submitter provides more information.',
  },
  {
    value: 'reject_both',
    label: 'Reject both',
    description:
      'Remove both claims from current source reporting until new evidence is submitted.',
  },
]

const ClaimSummary = ({ title, claim }) => (
  <div className="first-touch-conflict-claim h-100">
    <div className="small text-muted">{title}</div>
    {claim ? (
      <>
        <div className="fw-semibold mt-1">{getFirstTouchSourceLabel(claim)}</div>
        <div className="small text-muted mt-1">
          {formatFirstTouchDate(claim.occurredAt)}
          {claim.occurredTime ? ` at ${claim.occurredTime}` : ' · exact time unknown'} · submitted
          by {claim.submittedBy || 'Staff'}
        </div>
        {claim.chronologyNeedsReview ? (
          <CAlert color="warning" className="small mt-3 mb-0">
            This claim shares a date with another claim and its exact chronology requires review.
          </CAlert>
        ) : null}
        <div className="mt-3 d-grid gap-2">
          {(claim.proofs || []).map((proof, index) => (
            <EvidenceCard key={proof.id || index} proof={proof} compact />
          ))}
          {!claim.proofs?.length ? (
            <div className="text-muted">No image evidence attached.</div>
          ) : null}
        </div>
      </>
    ) : (
      <div className="text-muted mt-2">No competing claim was submitted.</div>
    )}
  </div>
)

const FirstTouchConflictResolutionModal = ({ visible, record, onClose, onResolve }) => {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [decision, setDecision] = useState('')
  const [selectedClaimId, setSelectedClaimId] = useState('')
  const [clarificationRecipientStaffId, setClarificationRecipientStaffId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const competingClaims = useMemo(
    () =>
      (
        record?.claims?.filter((claim) => record.conflict?.competingClaimIds?.includes(claim.id)) ||
        []
      ).sort((left, right) => {
        const leftChronology = `${left.occurredAt || ''}T${left.occurredTime || '99:99'}`
        const rightChronology = `${right.occurredAt || ''}T${right.occurredTime || '99:99'}`
        return leftChronology.localeCompare(rightChronology)
      }),
    [record],
  )
  const competingClaim = competingClaims.find((claim) => String(claim.id) === selectedClaimId)
  const clarificationRecipients = useMemo(() => {
    const byStaffId = new Map()
    ;[...(record?.claims || []), ...(record?.disputes || [])].forEach((entry) => {
      const staffId = Number(entry?.submittedByStaffId || 0)
      if (staffId > 0 && entry?.submittedBy) {
        byStaffId.set(staffId, { staffId, name: entry.submittedBy })
      }
    })
    return Array.from(byStaffId.values())
  }, [record])
  const clarificationRecipient = clarificationRecipients.find(
    (recipient) => String(recipient.staffId) === clarificationRecipientStaffId,
  )
  const selectedDecision = resolutionOptions.find((option) => option.value === decision)

  useEffect(() => {
    if (!visible) return
    setNote('')
    setError('')
    setDecision('')
    setConfirming(false)
    setSubmitting(false)
    setDirty(false)
    setConfirmDiscard(false)
    setClarificationRecipientStaffId('')
    setSelectedClaimId(competingClaims[0] ? String(competingClaims[0].id) : '')
  }, [competingClaims, visible])

  const updateDecision = (value) => {
    setDecision(value)
    setConfirming(false)
    setError('')
    setDirty(true)
  }

  const reviewDecision = () => {
    if (!decision) {
      setError('Choose a resolution before continuing.')
      return
    }
    if (decision === 'accept_competing' && !competingClaim) {
      setError('Select the competing claim that should become current.')
      return
    }
    if (decision === 'clarification_requested' && !clarificationRecipientStaffId) {
      setError('Select who must provide the requested clarification.')
      return
    }
    if (!note.trim()) {
      setError('Add a note explaining the evidence considered and the reason for this decision.')
      return
    }
    setError('')
    setConfirming(true)
  }

  const confirmDecision = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await Promise.resolve(
        onResolve(decision, note.trim(), competingClaim?.id, {
          clarificationRecipientStaffId: clarificationRecipientStaffId || null,
        }),
      )
      setDirty(false)
    } catch (resolveError) {
      setError(resolveError?.message || 'The conflict could not be resolved. Reload and try again.')
      setConfirming(false)
    } finally {
      setSubmitting(false)
    }
  }

  const requestClose = () => {
    if (submitting) return
    if (!dirty) {
      onClose()
      return
    }
    setConfirmDiscard(true)
  }

  const discardChanges = () => {
    setDirty(false)
    setConfirmDiscard(false)
    onClose()
  }

  return (
    <CModal
      visible={visible}
      onClose={requestClose}
      size="xl"
      alignment="center"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Resolve first-touch conflict · {record?.companyName}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color="warning">
          Compare every claim, image, date and submitter. The decision changes source reporting but
          never reallocates project sales credit.
        </CAlert>
        {error ? (
          <CAlert color="danger" role="alert">
            {error}
          </CAlert>
        ) : null}
        <CRow className="g-3">
          <CCol xs={12} lg={6}>
            <ClaimSummary title="Current claim" claim={record?.firstTouch} />
          </CCol>
          <CCol xs={12} lg={6}>
            {competingClaims.length > 1 ? (
              <div className="mb-3">
                <CFormLabel htmlFor="first-touch-competing-claim">
                  Competing claim to compare
                </CFormLabel>
                <CFormSelect
                  id="first-touch-competing-claim"
                  value={selectedClaimId}
                  onChange={(event) => {
                    setSelectedClaimId(event.target.value)
                    setConfirming(false)
                    setDirty(true)
                  }}
                >
                  {competingClaims.map((claim) => (
                    <option key={claim.id} value={claim.id}>
                      {formatFirstTouchDate(claim.occurredAt)}
                      {claim.occurredTime ? ` ${claim.occurredTime}` : ''} ·{' '}
                      {getFirstTouchSourceLabel(claim)} · {claim.submittedBy}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            ) : null}
            <ClaimSummary title="Selected competing claim" claim={competingClaim} />
          </CCol>
          <CCol xs={12}>
            <FirstTouchReviewSupplementalEvidence record={record} />
          </CCol>
          <CCol xs={12}>
            <fieldset className="first-touch-resolution-options">
              <legend className="h6 mb-3">Resolution</legend>
              <CRow className="g-2">
                {resolutionOptions.map((option) => (
                  <CCol xs={12} md={6} key={option.value}>
                    <div
                      className={`first-touch-resolution-option ${decision === option.value ? 'is-selected' : ''}`}
                    >
                      <CFormCheck
                        id={`first-touch-resolution-${option.value}`}
                        type="radio"
                        name="first-touch-resolution"
                        value={option.value}
                        label={option.label}
                        checked={decision === option.value}
                        onChange={(event) => updateDecision(event.target.value)}
                      />
                      <div className="small text-muted mt-1 ms-4">{option.description}</div>
                    </div>
                  </CCol>
                ))}
              </CRow>
            </fieldset>
          </CCol>
          {decision === 'clarification_requested' ? (
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="first-touch-clarification-recipient">
                Clarification required from
              </CFormLabel>
              <CFormSelect
                id="first-touch-clarification-recipient"
                value={clarificationRecipientStaffId}
                onChange={(event) => {
                  setClarificationRecipientStaffId(event.target.value)
                  setConfirming(false)
                  setDirty(true)
                }}
              >
                <option value="">Select a claim submitter</option>
                {clarificationRecipients.map((recipient) => (
                  <option key={recipient.staffId} value={recipient.staffId}>
                    {recipient.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          ) : null}
          <CCol xs={12}>
            <CFormLabel htmlFor="first-touch-resolution-note">
              {decision === 'clarification_requested' ? 'Information requested' : 'Resolution note'}
            </CFormLabel>
            <CFormTextarea
              id="first-touch-resolution-note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setConfirming(false)
                setDirty(true)
              }}
              placeholder={
                decision === 'clarification_requested'
                  ? 'State exactly what information or evidence must be provided.'
                  : 'Explain the evidence considered and the reason for the decision.'
              }
            />
          </CCol>
          {confirming ? (
            <CCol xs={12}>
              <CAlert color={decision === 'reject_both' ? 'danger' : 'info'} className="mb-0">
                <strong>Review before confirming:</strong> {selectedDecision?.description}
                {decision === 'clarification_requested'
                  ? ` Request will be assigned to ${clarificationRecipient?.name || 'the selected submitter'}.`
                  : ''}
              </CAlert>
            </CCol>
          ) : null}
        </CRow>
      </CModalBody>
      <CModalFooter className="justify-content-between gap-2">
        {confirmDiscard ? (
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 w-100">
            <span className="text-warning-emphasis fw-semibold">
              Discard this unfinished review?
            </span>
            <div className="d-flex gap-2 justify-content-end">
              <CButton color="secondary" variant="outline" onClick={() => setConfirmDiscard(false)}>
                Keep reviewing
              </CButton>
              <CButton color="danger" onClick={discardChanges}>
                Discard review
              </CButton>
            </div>
          </div>
        ) : (
          <>
            <CButton
              color="secondary"
              variant="outline"
              onClick={requestClose}
              disabled={submitting}
            >
              Cancel
            </CButton>
            {confirming ? (
              <div className="d-flex gap-2 flex-wrap justify-content-end">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                >
                  Back to decision
                </CButton>
                <CButton
                  color={decision === 'reject_both' ? 'danger' : 'primary'}
                  onClick={confirmDecision}
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Confirm decision'}
                </CButton>
              </div>
            ) : (
              <CButton color="primary" onClick={reviewDecision}>
                Review decision
              </CButton>
            )}
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default FirstTouchConflictResolutionModal
