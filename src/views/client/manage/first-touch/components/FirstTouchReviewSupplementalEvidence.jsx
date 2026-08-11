import React, { useMemo } from 'react'
import { CAlert } from '@coreui/react'
import { formatFirstTouchDate } from '../clientFirstTouchUtils'
import EvidenceCard from './FirstTouchEvidencePreview'

const EvidenceGrid = ({ proofs = [] }) =>
  proofs.length ? (
    <div className="row g-2 mt-1">
      {proofs.map((proof, index) => (
        <div className="col-12 col-lg-6" key={proof.id || index}>
          <EvidenceCard proof={proof} compact />
        </div>
      ))}
    </div>
  ) : (
    <div className="small text-muted mt-2">No supporting images attached.</div>
  )

const FirstTouchReviewSupplementalEvidence = ({ record }) => {
  const entries = useMemo(() => {
    const disputeIds = new Set(record?.conflict?.disputeIds || [])
    const disputes = (record?.disputes || [])
      .filter((dispute) => dispute.status === 'open' || disputeIds.has(dispute.id))
      .map((dispute) => ({ type: 'dispute', at: dispute.submittedAt || '', item: dispute }))
    const clarifications = (record?.clarifications || [])
      .filter((clarification) => clarification.conflictId === record?.conflict?.id)
      .map((clarification) => ({
        type: 'clarification',
        at: clarification.respondedAt || clarification.createdAt || '',
        item: clarification,
      }))

    return [...disputes, ...clarifications].sort((left, right) => left.at.localeCompare(right.at))
  }, [record])

  if (!entries.length) return null

  return (
    <section aria-labelledby="first-touch-review-supplemental-title">
      <h3 id="first-touch-review-supplemental-title" className="h6 mb-3">
        Disputes and clarifications
      </h3>
      <div className="d-grid gap-3">
        {entries.map(({ type, item }) =>
          type === 'dispute' ? (
            <article className="first-touch-origin-note" key={`dispute-${item.id}`}>
              <div className="d-flex justify-content-between gap-2 flex-wrap">
                <strong>{item.reason || 'Dispute'}</strong>
                <span className="small text-muted">
                  {formatFirstTouchDate(item.submittedAt)} · {item.submittedBy || 'Staff'}
                </span>
              </div>
              <div className="mt-2">{item.explanation}</div>
              <EvidenceGrid proofs={item.proofs} />
            </article>
          ) : (
            <article className="first-touch-origin-note" key={`clarification-${item.id}`}>
              <div className="d-flex justify-content-between gap-2 flex-wrap">
                <strong>Clarification requested from {item.requestedFrom}</strong>
                <span className="small text-muted">
                  {formatFirstTouchDate(item.createdAt)} · {item.status}
                </span>
              </div>
              <div className="mt-2">{item.requestNote}</div>
              {item.response ? (
                <CAlert color="info" className="mt-3 mb-0">
                  <div className="fw-semibold mb-1">
                    Response from {item.respondedBy || item.requestedFrom}
                  </div>
                  {item.response}
                </CAlert>
              ) : (
                <div className="small text-warning-emphasis mt-2">Response pending.</div>
              )}
              <EvidenceGrid proofs={item.proofs} />
            </article>
          ),
        )}
      </div>
    </section>
  )
}

export default FirstTouchReviewSupplementalEvidence
