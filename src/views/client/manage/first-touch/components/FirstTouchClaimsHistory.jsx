import React from 'react'
import { CAlert, CCol, CRow } from '@coreui/react'
import {
  formatFirstTouchDate,
  getFirstTouchEmploymentStatusLabel,
  getFirstTouchPersonName,
  getFirstTouchSourceLabel,
} from '../clientFirstTouchUtils'
import FirstTouchStatusBadge from './FirstTouchStatusBadge'

const ClaimRevisionHistory = ({ claim }) => {
  const revisions = claim.revisions || []
  if (!revisions.length) return null

  return (
    <details className="first-touch-revisions mt-3">
      <summary className="fw-semibold">
        View {revisions.length} previous version{revisions.length === 1 ? '' : 's'}
      </summary>
      <div className="d-grid gap-2 mt-3">
        {[...revisions].reverse().map((revision, index) => {
          const previous = revision.previous || {}
          return (
            <article className="first-touch-revision" key={revision.revisedAt || index}>
              <div className="d-flex justify-content-between gap-2 flex-wrap">
                <strong>Previous version {revisions.length - index}</strong>
                <span className="small text-muted">
                  Changed by {revision.revisedBy || 'Staff'} ·{' '}
                  {formatFirstTouchDate(revision.revisedAt)}
                </span>
              </div>
              <div className="small mt-2">
                <span className="text-muted">Reason:</span>{' '}
                {revision.reason || 'No reason was recorded for this historical edit.'}
              </div>
              <dl className="first-touch-revision-grid mt-3 mb-0">
                <div>
                  <dt>Encounter</dt>
                  <dd>
                    {formatFirstTouchDate(previous.occurredAt)}
                    {previous.occurredTime ? ` at ${previous.occurredTime}` : ' · time unknown'}
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{getFirstTouchSourceLabel(previous)}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{getFirstTouchPersonName(previous) || 'Not identified'}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{previous.proofs?.length || previous.proofCount || 0} image(s)</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </details>
  )
}

const FirstTouchClaimsHistory = ({ record }) => {
  const claims = record.claims || (record.firstTouch ? [record.firstTouch] : [])

  return (
    <section aria-labelledby="first-touch-claims-title">
      <h2 id="first-touch-claims-title" className="h5 mb-1">
        Claims and decision history
      </h2>
      <p className="text-muted mb-4">
        Each submission remains auditable. Only the current uncontested or resolved claim is used in
        source reporting.
      </p>
      {record.conflict?.status === 'resolved' ? (
        <CAlert color="info">
          Resolved by {record.conflict.resolvedBy} on{' '}
          {formatFirstTouchDate(record.conflict.resolvedAt)}. {record.conflict.comment}
        </CAlert>
      ) : null}
      {['open', 'clarification_requested'].includes(record.conflict?.status) ? (
        <CAlert color="warning">
          This client has an open conflict. The current claim remains visible but is excluded from
          source aggregation until a manager or system administrator resolves it.
          {record.conflict?.clarificationRecipient
            ? ` Clarification is required from ${record.conflict.clarificationRecipient}.`
            : ''}
        </CAlert>
      ) : null}
      <CRow className="g-3">
        {claims.map((claim) => (
          <CCol xs={12} lg={6} key={claim.id}>
            <article className="first-touch-conflict-claim h-100">
              <div className="d-flex align-items-start justify-content-between gap-2">
                <div>
                  <div className="fw-semibold">{getFirstTouchSourceLabel(claim)}</div>
                  <div className="small text-muted mt-1">
                    {formatFirstTouchDate(claim.occurredAt)}
                    {claim.occurredTime ? ` at ${claim.occurredTime}` : ' · exact time unknown'} ·
                    submitted by {claim.submittedBy}
                  </div>
                </div>
                <FirstTouchStatusBadge status={claim.status} />
              </div>
              {claim.notes ? <p className="mb-0 mt-3">{claim.notes}</p> : null}
              {getFirstTouchPersonName(claim) ? (
                <div className="small mt-3">
                  Handled by or referred through: <strong>{getFirstTouchPersonName(claim)}</strong>
                  {getFirstTouchEmploymentStatusLabel(claim)
                    ? ` · ${getFirstTouchEmploymentStatusLabel(claim)}`
                    : ''}
                </div>
              ) : null}
              <div className="small text-muted mt-3">
                {claim.proofCount || 0} evidence item(s) · {claim.revisions?.length || 0}{' '}
                revision(s)
              </div>
              <ClaimRevisionHistory claim={claim} />
            </article>
          </CCol>
        ))}
        {!claims.length ? (
          <CCol xs={12}>
            <CAlert color="secondary">No claims recorded.</CAlert>
          </CCol>
        ) : null}
      </CRow>
      {record.disputes?.length ? (
        <div className="mt-4">
          <h3 className="h6">Disputes</h3>
          <div className="d-grid gap-2">
            {record.disputes.map((dispute) => (
              <div className="first-touch-origin-note" key={dispute.id}>
                {dispute.explanation}
                <div className="small text-muted mt-1">
                  Submitted by {dispute.submittedBy} · {formatFirstTouchDate(dispute.submittedAt)}
                  {' · '}
                  {dispute.status}
                  {dispute.proofs?.length ? ` · ${dispute.proofs.length} attachment(s)` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {record.clarifications?.length ? (
        <div className="mt-4">
          <h3 className="h6">Clarifications</h3>
          <div className="d-grid gap-2">
            {record.clarifications.map((clarification) => (
              <div className="first-touch-origin-note" key={clarification.id}>
                <div className="fw-semibold">Requested from {clarification.requestedFrom}</div>
                <div className="mt-1">{clarification.requestNote}</div>
                {clarification.response ? (
                  <div className="mt-2">
                    <span className="text-muted">Response:</span> {clarification.response}
                  </div>
                ) : null}
                <div className="small text-muted mt-1">
                  {clarification.status}
                  {clarification.respondedBy ? ` · responded by ${clarification.respondedBy}` : ''}
                  {clarification.proofs?.length
                    ? ` · ${clarification.proofs.length} attachment(s)`
                    : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default FirstTouchClaimsHistory
