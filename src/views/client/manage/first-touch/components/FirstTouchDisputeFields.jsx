import React from 'react'
import { CFormLabel, CFormSelect, CFormTextarea } from '@coreui/react'
import { formatFirstTouchDate, getFirstTouchSourceLabel } from '../clientFirstTouchUtils'
import FirstTouchEvidenceEditor from './FirstTouchEvidenceEditor'

const disputeReasons = [
  ['incorrect_date', 'The encounter date is incorrect'],
  ['incorrect_source', 'The source or channel is incorrect'],
  ['incorrect_client', 'The evidence belongs to a different client'],
  ['unreliable_evidence', 'The evidence is unreliable or incomplete'],
  ['other', 'Other'],
]

const FirstTouchDisputeFields = ({
  companyName,
  currentClaim,
  reason,
  explanation,
  proofs,
  evidenceBusy,
  reasonInvalid,
  explanationInvalid,
  evidenceInvalid,
  errorId,
  onReasonChange,
  onExplanationChange,
  onAddEvidence,
  onReplaceEvidence,
  onRemoveEvidence,
}) => (
  <>
    <p className="text-muted">
      Raise a separate dispute for <strong className="text-body">{companyName}</strong>. The current
      evidence remains visible until an independent reviewer resolves the conflict.
    </p>
    <div className="first-touch-origin-note mb-3">
      <div className="small text-muted">Current claim</div>
      <div className="fw-semibold">{getFirstTouchSourceLabel(currentClaim)}</div>
      <div className="small text-muted mt-1">
        {formatFirstTouchDate(currentClaim?.occurredAt)} · submitted by{' '}
        {currentClaim?.submittedBy || 'Staff'}
      </div>
    </div>
    <CFormLabel htmlFor="first-touch-dispute-reason">Reason</CFormLabel>
    <CFormSelect
      id="first-touch-dispute-reason"
      className="mb-3"
      value={reason}
      onChange={(event) => onReasonChange(event.target.value)}
      invalid={reasonInvalid}
      aria-describedby={reasonInvalid ? errorId : undefined}
      required
    >
      <option value="">Select a reason</option>
      {disputeReasons.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </CFormSelect>
    <CFormLabel htmlFor="first-touch-dispute-explanation">Explanation</CFormLabel>
    <CFormTextarea
      id="first-touch-dispute-explanation"
      rows={4}
      value={explanation}
      onChange={(event) => onExplanationChange(event.target.value)}
      placeholder="State what is wrong and any information the reviewer should compare."
      invalid={explanationInvalid}
      aria-describedby={explanationInvalid ? errorId : undefined}
      required
    />
    <div className="mt-3">
      <FirstTouchEvidenceEditor
        inputId="first-touch-dispute-proof"
        proofs={proofs}
        busy={evidenceBusy}
        evidenceRequired={false}
        invalid={evidenceInvalid}
        errorId={evidenceInvalid ? errorId : undefined}
        onAdd={onAddEvidence}
        onReplace={onReplaceEvidence}
        onRemove={onRemoveEvidence}
      />
      <div className="small text-muted mt-2">Supporting dispute images are optional.</div>
    </div>
  </>
)

export default FirstTouchDisputeFields
