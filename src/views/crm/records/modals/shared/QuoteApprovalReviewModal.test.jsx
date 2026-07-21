import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuoteApprovalReviewModal from './QuoteApprovalReviewModal'

const baseApproval = {
  id: 7,
  service: 'training',
  quote_id: 21,
  quote_ref_no: 'QTR-021',
  zone: 'yellow',
  required_step: 'hod',
  quoted_total: 130,
  estimated_cost: 100,
  margin_percent: 30,
  trigger_reasons: ['Markup falls in the HOD review range.'],
}

afterEach(cleanup)

describe('QuoteApprovalReviewModal', () => {
  it('shows decision controls only to the assigned pending approver', () => {
    render(
      <QuoteApprovalReviewModal
        visible
        approval={{ ...baseApproval, status: 'pending', can_decide: true }}
        remarks=""
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Preview Draft PDF' })).toBeInTheDocument()
  })

  it('renders a decision read-only for a requester or unrelated user', () => {
    render(
      <QuoteApprovalReviewModal
        visible
        approval={{
          ...baseApproval,
          status: 'approved',
          can_decide: false,
          decided_by_name: 'Azlin',
          decision_remarks: 'Approved for issue.',
        }}
        remarks=""
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('alert').some((alert) => /approved by azlin/i.test(alert.textContent)),
    ).toBe(true)
    expect(screen.getByRole('link', { name: 'Open Approved PDF' })).toBeInTheDocument()
  })
})
