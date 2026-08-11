import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FirstTouchReviewSupplementalEvidence from '../components/FirstTouchReviewSupplementalEvidence'

describe('FirstTouchReviewSupplementalEvidence', () => {
  it('shows dispute and clarification evidence in the reviewer dossier', () => {
    render(
      <FirstTouchReviewSupplementalEvidence
        record={{
          conflict: { id: 91, disputeIds: [61] },
          disputes: [
            {
              id: 61,
              status: 'open',
              reason: 'Earlier encounter',
              explanation: 'The attached image predates the current claim.',
              submittedBy: 'Dispute User',
              submittedAt: '2026-08-10T09:00:00+08:00',
              proofs: [{ id: 601, originalName: 'earlier.png', platform: 'WhatsApp' }],
            },
          ],
          clarifications: [
            {
              id: 71,
              conflictId: 91,
              requestedFrom: 'Evidence Submitter',
              requestNote: 'Confirm the timestamp.',
              status: 'responded',
              response: 'The screenshot was captured on the stated date.',
              respondedBy: 'Evidence Submitter',
              createdAt: '2026-08-10T10:00:00+08:00',
              respondedAt: '2026-08-10T11:00:00+08:00',
              proofs: [
                { id: 701, originalName: 'timestamp.png', platform: 'Clarification evidence' },
              ],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Earlier encounter')).toBeInTheDocument()
    expect(screen.getByText('Response from Evidence Submitter')).toBeInTheDocument()
    expect(screen.getByText('The screenshot was captured on the stated date.')).toBeInTheDocument()
    expect(screen.getAllByText('Screenshot evidence')).toHaveLength(2)
  })
})
