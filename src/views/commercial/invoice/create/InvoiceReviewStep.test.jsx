import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import InvoiceReviewStep from './InvoiceReviewStep'

const baseProps = {
  payload: {
    project_id: 10,
    service_type: 'Industrial Hygiene',
    grand_total: 1300,
    amount: 1300,
    sst_amount: 0,
    breakdown: [],
  },
  project: { project_name: 'IH Project' },
  projectInvoiceSummary: {
    projectValue: 1200,
    alreadyInvoiced: 0,
    thisInvoice: 1300,
    remainingAfter: -100,
    canCloseProject: true,
  },
  closeProject: false,
  onCloseProjectChange: vi.fn(),
  submitting: false,
  onBack: vi.fn(),
  onConfirm: vi.fn(),
  deviationReason: '',
  deviationAcknowledged: false,
  deviationError: 'Briefly explain why this invoice exceeds the project value.',
  onDeviationReasonChange: vi.fn(),
  onDeviationAcknowledgedChange: vi.fn(),
}

describe('InvoiceReviewStep project-value guidance', () => {
  afterEach(cleanup)

  it('shows concise overage guidance and focuses the reason field', async () => {
    render(<InvoiceReviewStep {...baseProps} />)

    expect(screen.getByText(/RM 100.00 above the remaining project value/i)).toBeInTheDocument()
    const reason = screen.getByLabelText('Reason for exceeding project value')
    await waitFor(() => expect(reason).toHaveFocus())
    expect(
      screen.getByText('Briefly explain why this invoice exceeds the project value.'),
    ).toBeInTheDocument()
  })

  it('does not add an acknowledgement to the normal path', () => {
    render(
      <InvoiceReviewStep
        {...baseProps}
        projectInvoiceSummary={{ ...baseProps.projectInvoiceSummary, remainingAfter: 100 }}
        deviationError=""
      />,
    )

    expect(screen.queryByLabelText('Reason for exceeding project value')).not.toBeInTheDocument()
  })

  it('shows the resolved category without replacing the submitted workflow type', () => {
    const payload = { ...baseProps.payload, service_type: 'Special Service', project_id: 47 }
    render(
      <InvoiceReviewStep
        {...baseProps}
        payload={payload}
        project={{ project_name: 'Environment Project' }}
        serviceCategory="Environment"
      />,
    )

    expect(screen.getByText('Environment | Project ID 47')).toBeInTheDocument()
    expect(payload.service_type).toBe('Special Service')
  })

  it('falls back to the workflow type when no resolved category is available', () => {
    render(
      <InvoiceReviewStep
        {...baseProps}
        payload={{ ...baseProps.payload, service_type: 'Special Service', project_id: 48 }}
        project={{ project_name: 'Legacy Special Project' }}
      />,
    )

    expect(screen.getByText('Special Service | Project ID 48')).toBeInTheDocument()
  })
})
