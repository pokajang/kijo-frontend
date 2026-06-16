import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProjectValueUpdateModal from './ProjectValueUpdateModal'
import { previewProjectValueImpact, updateProjectCurrentValue } from '../projectApi'

vi.mock('../projectApi', () => ({
  getCurrentProjectValue: (project = {}, fallback = 0) =>
    project.current_project_value ??
    project.resolved_project_value ??
    project.quote_value ??
    fallback,
  previewProjectValueImpact: vi.fn(),
  updateProjectCurrentValue: vi.fn(),
}))

vi.mock('../../../../components/toast/toastService', () => ({
  showToast: vi.fn(),
}))

const project = {
  id: 12,
  project_name: 'Variation Project',
  quote_value: 1000,
  current_project_value: null,
}

const impactPayload = {
  status: 'success',
  data: {
    old_project_value: 1000,
    new_project_value: 1200,
    delta: 200,
    summary: {
      invoice_count: 3,
      editable_invoice_count: 1,
      payment_record_count: 1,
      blocked_count: 1,
      delivery_order_count: 1,
      jd14_count: 1,
      affected_count: 5,
    },
    documents: {
      invoices: [
        {
          id: 601,
          reference: 'INV-001',
          old_amount: 900,
          new_amount: 1200,
          delta: 300,
          classification: 'editable',
          message: 'Invoice can be updated with a Project Value Variation line.',
        },
        {
          id: 602,
          reference: 'INV-PAID',
          old_amount: 1000,
          new_amount: 1200,
          delta: 200,
          classification: 'adjustment_required',
          message: 'Paid/cancelled invoice values will not be overwritten.',
        },
      ],
      payment_adjustments: [
        {
          id: 602,
          reference: 'INV-PAID',
          old_amount: 1000,
          new_amount: 1200,
          delta: 200,
          classification: 'adjustment_required',
          message:
            'Paid receipt/payment will not be overwritten; an adjustment-required audit entry will be recorded.',
        },
      ],
      blocked_items: [
        {
          id: 603,
          reference: 'INV-VOID',
          old_amount: 1000,
          new_amount: 1200,
          delta: 200,
          classification: 'blocked',
          message: 'Cancelled, canceled, or void invoices are not changed by project value sync.',
        },
      ],
      delivery_orders: [
        {
          id: 701,
          reference: 'DO-001',
          classification: 'informational',
          message: 'Delivery Orders do not carry monetary totals in v1.',
        },
      ],
      jd14: [
        {
          id: 801,
          reference: 'JD14-001',
          classification: 'informational',
          message: 'Existing JD14 records are not mutated by project value changes.',
        },
      ],
    },
  },
}

describe('ProjectValueUpdateModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('previews impact and submits selected commercial sync actions with acknowledgement', async () => {
    previewProjectValueImpact.mockResolvedValueOnce(impactPayload)
    updateProjectCurrentValue.mockResolvedValueOnce({
      status: 'success',
      data: {
        quote_value: 1000,
        current_project_value: 1200,
        resolved_project_value: 1200,
      },
    })
    const onUpdated = vi.fn()
    const onClose = vi.fn()

    render(
      <ProjectValueUpdateModal visible project={project} onUpdated={onUpdated} onClose={onClose} />,
    )

    expect(screen.getByLabelText('New Project Current Value (RM)')).toHaveValue(1000)

    fireEvent.change(screen.getByLabelText('New Project Current Value (RM)'), {
      target: { value: '1200' },
    })
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Approved variation order' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }))

    await waitFor(() => {
      expect(previewProjectValueImpact).toHaveBeenCalledWith(12, {
        current_project_value: 1200,
        reason: 'Approved variation order',
      })
    })

    expect(await screen.findByText(/This project has 3 invoices/)).toBeInTheDocument()
    expect(
      screen.getByText(/Project value will change from RM 1,000.00 to RM 1,200.00/),
    ).toBeInTheDocument()

    const invoiceCheckbox = screen.getByLabelText(/Update Invoice INV-001/)
    const paymentCheckbox = screen.getByLabelText(
      /Record adjustment required for paid receipt\/payment delta RM 200.00/,
    )
    expect(screen.queryByLabelText(/Update Invoice INV-PAID/)).not.toBeInTheDocument()
    expect(screen.getByText(/Blocked INV-VOID cannot be changed/)).toBeInTheDocument()
    expect(screen.getByText('Adjustment required')).toBeInTheDocument()
    expect(screen.getByText(/Delivery Order DO-001 is informational/)).toBeInTheDocument()
    expect(screen.getByText(/JD14 JD14-001 is informational/)).toBeInTheDocument()

    fireEvent.click(invoiceCheckbox)
    await waitFor(() => expect(invoiceCheckbox).toBeChecked())
    fireEvent.click(paymentCheckbox)
    await waitFor(() => expect(paymentCheckbox).toBeChecked())
    fireEvent.click(
      screen.getByLabelText(
        'I understand this will change selected commercial records and create audit history.',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Update' }))

    await waitFor(() => {
      expect(updateProjectCurrentValue).toHaveBeenCalledWith(12, {
        current_project_value: 1200,
        reason: 'Approved variation order',
        acknowledgement: true,
        sync: {
          invoices: [601],
          payment_adjustments: [602],
          delivery_orders: [],
        },
      })
    })
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        current_project_value: 1200,
        resolved_project_value: 1200,
      }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('shows commercial resync wording when project value is unchanged', async () => {
    previewProjectValueImpact.mockResolvedValueOnce({
      status: 'success',
      data: {
        old_project_value: 1200,
        new_project_value: 1200,
        delta: 0,
        summary: {
          invoice_count: 1,
          editable_invoice_count: 1,
          payment_record_count: 0,
          blocked_count: 0,
          delivery_order_count: 0,
          jd14_count: 0,
          affected_count: 1,
        },
        documents: {
          invoices: [
            {
              id: 701,
              reference: 'INV-RESYNC',
              old_amount: 1000,
              new_amount: 1200,
              delta: 200,
              target_adjustment_amount: 200,
              classification: 'editable',
              message: 'Invoice can be updated with a Project Value Variation line.',
            },
          ],
        },
      },
    })
    updateProjectCurrentValue.mockResolvedValueOnce({
      status: 'success',
      data: {
        quote_value: 1000,
        current_project_value: 1200,
        resolved_project_value: 1200,
      },
    })

    render(
      <ProjectValueUpdateModal
        visible
        project={{ ...project, current_project_value: 1200, resolved_project_value: 1200 }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Resync skipped invoice' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }))

    expect(await screen.findByText(/Project value is already RM 1,200.00/)).toBeInTheDocument()
    const invoiceCheckbox = screen.getByLabelText(
      /Sync Invoice INV-RESYNC to current project value RM 1,200.00/,
    )
    expect(screen.getByRole('button', { name: 'Confirm Sync' })).toBeDisabled()

    fireEvent.click(invoiceCheckbox)
    fireEvent.click(
      screen.getByLabelText(
        'I understand this will change selected commercial records and create audit history.',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Sync' }))

    await waitFor(() => {
      expect(updateProjectCurrentValue).toHaveBeenCalledWith(12, {
        current_project_value: 1200,
        reason: 'Resync skipped invoice',
        acknowledgement: true,
        sync: {
          invoices: [701],
          payment_adjustments: [],
          delivery_orders: [],
        },
      })
    })
  })

  it('uses reduction wording when target invoice value is lower', async () => {
    previewProjectValueImpact.mockResolvedValueOnce({
      status: 'success',
      data: {
        old_project_value: 1000,
        new_project_value: 800,
        delta: -200,
        summary: {
          invoice_count: 1,
          editable_invoice_count: 1,
          payment_record_count: 0,
          blocked_count: 0,
          delivery_order_count: 0,
          jd14_count: 0,
          affected_count: 1,
        },
        documents: {
          invoices: [
            {
              id: 702,
              reference: 'INV-REDUCE',
              old_amount: 1000,
              new_amount: 800,
              delta: -200,
              target_adjustment_amount: -200,
              classification: 'editable',
              message: 'Invoice can be reduced with a Project Value Reduction line.',
            },
          ],
        },
      },
    })

    render(<ProjectValueUpdateModal visible project={project} />)

    fireEvent.change(screen.getByLabelText('New Project Current Value (RM)'), {
      target: { value: '800' },
    })
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Reduced scope' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }))

    expect(
      await screen.findByLabelText(/Reduce Invoice INV-REDUCE from RM 1,000.00 to RM 800.00/),
    ).toBeInTheDocument()
  })

  it('does not require acknowledgement when no commercial documents are affected', async () => {
    previewProjectValueImpact.mockResolvedValueOnce({
      status: 'success',
      data: {
        old_project_value: 1000,
        new_project_value: 900,
        delta: -100,
        summary: {
          invoice_count: 0,
          editable_invoice_count: 0,
          payment_record_count: 0,
          blocked_count: 0,
          delivery_order_count: 0,
          jd14_count: 0,
          affected_count: 0,
        },
        documents: {},
      },
    })

    render(<ProjectValueUpdateModal visible project={project} />)

    fireEvent.change(screen.getByLabelText('New Project Current Value (RM)'), {
      target: { value: '900' },
    })
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'No commercial docs' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }))

    expect(await screen.findByText('No commercial documents will be updated.')).toBeInTheDocument()
    expect(
      screen.queryByLabelText(
        'I understand this will change selected commercial records and create audit history.',
      ),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Update' })).not.toBeDisabled()
  })
})
