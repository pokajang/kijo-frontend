import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import VendorPaymentWorkflowTimeline from './VendorPaymentWorkflowTimeline'
import {
  buildVendorPaymentWorkflowStep,
  formatVendorPaymentWorkflowDate,
  getVendorPaymentWorkflowSummary,
} from './vendorPaymentWorkflow'

const recipients = [
  { staffId: 10, fullName: 'Reviewer One', nameCode: 'R1' },
  { staffId: 20, fullName: 'Reviewer Two', nameCode: 'R2' },
  { staffId: 30, fullName: 'Reviewer Three', nameCode: 'R3' },
  { staffId: 40, fullName: 'Reviewer Four', nameCode: 'R4' },
]

describe('vendor payment workflow presentation', () => {
  it('leads with the current stage and reports progress', () => {
    const summary = getVendorPaymentWorkflowSummary({
      status: 'Approved',
      workflow_flow: {
        stages: [
          { key: 'review.1', stageType: 'review', state: 'completed', status: 'Reviewed' },
          { key: 'approval.1', stageType: 'approval', state: 'completed', status: 'Approved' },
          {
            key: 'finance.1',
            stageType: 'finance',
            state: 'current',
            status: 'Ready for payment',
          },
        ],
      },
    })

    expect(summary.primary).toBe('Finance · Voucher required')
    expect(summary.progress).toBe('2 of 3 stages completed')
  })

  it('shows configured personnel without inventing a missing historical actor', () => {
    render(
      <VendorPaymentWorkflowTimeline
        stages={[
          {
            key: 'review.1',
            stageType: 'review',
            label: 'Review',
            state: 'completed',
            status: 'Reviewed',
            recipients,
          },
        ]}
      />,
    )

    expect(screen.getByText('Historical actor unavailable')).toBeInTheDocument()
    expect(screen.getByText('Configured reviewers')).toBeInTheDocument()
    expect(screen.getByText('Reviewer One (R1)')).toBeInTheDocument()
    expect(screen.queryByText('Reviewer Four (R4)')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+1 more' }))

    expect(screen.getByText('Reviewer Four (R4)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('renders terminal states with text as well as semantic state hooks', () => {
    const { container } = render(
      <VendorPaymentWorkflowTimeline
        stages={[
          {
            key: 'review.1',
            stageType: 'review',
            label: 'Review',
            state: 'completed',
            status: 'Reviewed',
          },
          {
            key: 'approval.1',
            stageType: 'approval',
            label: 'Approval',
            state: 'returned',
            status: 'Returned',
            actor: { staffId: 20, fullName: 'Approver User', nameCode: 'APP' },
            remarks: 'Please attach the invoice.',
          },
        ]}
      />,
    )

    expect(container.querySelector('[data-state="returned"]')).toBeInTheDocument()
    expect(screen.getByText('Returned')).toBeInTheDocument()
    expect(screen.getByText('Returned by')).toBeInTheDocument()
    expect(screen.getByText('Please attach the invoice.')).toBeInTheDocument()
  })

  it('formats workflow timestamps and legacy text consistently', () => {
    const formatted = formatVendorPaymentWorkflowDate('2026-05-29 09:09:04')
    const step = buildVendorPaymentWorkflowStep({
      key: 'review.1',
      stageType: 'review',
      label: 'Review',
      state: 'completed',
      status: 'Reviewed',
      recipients: [recipients[0]],
    })

    expect(formatted).toContain('29 May 2026')
    expect(formatted).toContain('9:09')
    expect(step).toContain('Configured reviewers Reviewer One (R1)')
    expect(step).not.toContain('Assigned to')
  })
})
