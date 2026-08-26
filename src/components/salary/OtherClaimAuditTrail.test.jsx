import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import OtherClaimAuditTrail from './OtherClaimAuditTrail'

describe('OtherClaimAuditTrail', () => {
  afterEach(cleanup)

  it('shows the edit event and its previous claim snapshot summary', () => {
    render(
      <OtherClaimAuditTrail
        id="claimAudit"
        formatDateTime={(value) => value}
        events={[
          {
            id: 8,
            action: 'edit',
            reason: 'Claim edited and resubmitted before review.',
            previousSnapshot: { claimsTotal: 120, claims: [{ id: 'mileage-1' }] },
            actedAt: '2026-08-20 11:20',
            actorName: 'Aina',
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Record audit' })).toBeInTheDocument()
    expect(screen.getByText('Claim edited and resubmitted')).toBeInTheDocument()
    expect(screen.getByText(/Previous total: RM 120.00/)).toBeInTheDocument()
    expect(screen.getByText(/Previous items: 1/)).toBeInTheDocument()
  })
})
