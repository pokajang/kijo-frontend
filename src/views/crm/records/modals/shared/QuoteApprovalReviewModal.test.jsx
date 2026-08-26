import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  it('renders stale decision notice and blocks actions', () => {
    render(
      <QuoteApprovalReviewModal
        visible
        approval={{ ...baseApproval, status: 'pending', can_decide: true }}
        decisionNotice={{
          title: 'Approval request is outdated',
          message: 'This quotation changed and needs re-review.',
        }}
        remarks=""
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(screen.getByText(/outdated/i)).toBeInTheDocument()
    expect(screen.getByText('This quotation changed and needs re-review.')).toBeInTheDocument()
  })

  it('shows queue progress when reviewing multiple approvals', () => {
    render(
      <QuoteApprovalReviewModal
        visible
        approval={{ ...baseApproval, status: 'pending', can_decide: true }}
        remarks=""
        queuePosition={2}
        queueSize={5}
        queueItems={[
          { id: 1, index: 0, quoteRefNo: 'QTR-020' },
          { id: 2, index: 1, quoteRefNo: 'QTR-021' },
          { id: 3, index: 2, quoteRefNo: 'QTR-022' },
        ]}
        canNavigateNext
        canNavigatePrevious={false}
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    expect(screen.getByText('Reviewing 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled()
  })

  it('keeps queue labels compact while retaining the full client name as a tooltip', () => {
    const clientName = 'NZ URUSBINA SDN. BHD. WITH A VERY LONG COMPANY NAME FOR TESTING'

    render(
      <QuoteApprovalReviewModal
        visible
        approval={{ ...baseApproval, status: 'pending', can_decide: true }}
        remarks=""
        queuePosition={1}
        queueSize={2}
        queueItems={[
          {
            id: 1,
            index: 0,
            quoteRefNo: 'QSS25-0001AZA',
            quoteTitle: 'This title must not be included in the queue selector',
            quoteDate: '2025-08-01',
            clientName,
          },
          { id: 2, index: 1, quoteRefNo: 'QSS25-0002AZA', clientName: 'Acme Sdn. Bhd.' },
        ]}
        canNavigateNext
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    const selector = screen.getByRole('combobox', { name: /jump to quotation/i })
    expect(selector).toHaveAttribute('title', `QSS25-0001AZA — ${clientName}`)
    expect(screen.getByRole('option', { name: /QSS25-0001AZA — NZ URUSBINA/i })).toBeInTheDocument()
    expect(screen.queryByText(/This title must not be included/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Date: 01 Aug 2025/i)).not.toBeInTheDocument()
  })

  it('warns approvers when decision-critical quotation metadata is unavailable', () => {
    render(
      <QuoteApprovalReviewModal
        visible
        approval={{
          ...baseApproval,
          quoted_total: null,
          estimated_cost: null,
          margin_percent: null,
          review_metadata_missing_fields: ['client', 'quoted total', 'estimated cost'],
          status: 'pending',
          can_decide: true,
        }}
        remarks=""
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    expect(screen.getByText(/some quotation details could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/missing: client, quoted total, estimated cost/i)).toBeInTheDocument()
    expect(screen.getAllByText('Not available')).toHaveLength(3)
  })

  it('invokes queue navigation handlers in review mode', () => {
    const onQueueNext = vi.fn()
    const onQueuePrevious = vi.fn()
    const onQueueSkip = vi.fn()
    const onQueueJump = vi.fn()

    render(
      <QuoteApprovalReviewModal
        visible
        approval={{ ...baseApproval, status: 'pending', can_decide: true }}
        remarks=""
        queuePosition={2}
        queueSize={5}
        queueItems={[
          { id: 1, index: 0, quoteRefNo: 'QTR-020' },
          { id: 2, index: 1, quoteRefNo: 'QTR-021' },
          { id: 3, index: 2, quoteRefNo: 'QTR-022' },
        ]}
        canNavigateNext
        canNavigatePrevious
        onQueueNext={onQueueNext}
        onQueuePrevious={onQueuePrevious}
        onQueueSkip={onQueueSkip}
        onQueueJump={onQueueJump}
        onRemarksChange={vi.fn()}
        onCancel={vi.fn()}
        onDecision={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onQueuePrevious).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onQueueNext).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onQueueSkip).toHaveBeenCalledOnce()
    fireEvent.change(screen.getByRole('combobox', { name: /jump to quotation/i }), {
      target: { value: '2' },
    })
    expect(onQueueJump).toHaveBeenCalledOnce()
    expect(onQueueJump).toHaveBeenCalledWith('2')
  })
})
