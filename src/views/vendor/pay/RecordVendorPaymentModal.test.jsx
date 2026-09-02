import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RecordVendorPaymentModal from './RecordVendorPaymentModal'

const mocks = vi.hoisted(() => ({
  recordPayment: vi.fn().mockResolvedValue({ status: 'success' }),
}))

vi.mock('../payment-records/vendorPaymentApi', () => ({
  newVendorPaymentRequestKey: () => 'payment-key',
  recordVendorPayment: mocks.recordPayment,
}))

const payment = {
  id: 456,
  amount: 125,
  paid_amount: 0,
  method: 'Online Transfer',
  status: 'Approved',
  version: 2,
  voucher: { voucher_number: 'PV-2026-000456' },
}

describe('RecordVendorPaymentModal', () => {
  beforeEach(() => mocks.recordPayment.mockClear())
  afterEach(cleanup)

  it('records structured settlement evidence from the payment request', async () => {
    const onRecorded = vi.fn()
    render(
      <RecordVendorPaymentModal
        visible
        payment={payment}
        onClose={vi.fn()}
        onRecorded={onRecorded}
      />,
    )

    fireEvent.change(screen.getByLabelText('Amount paid now'), { target: { value: '121.50' } })
    fireEvent.change(screen.getByLabelText('Transaction reference'), {
      target: { value: 'TXN-123' },
    })
    fireEvent.change(screen.getByLabelText(/Payment remarks/), {
      target: { value: 'Bank keyed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Record Payment' }))

    await waitFor(() =>
      expect(mocks.recordPayment).toHaveBeenCalledWith(
        payment,
        expect.objectContaining({
          amount: '121.50',
          method: 'Online Transfer',
          referenceNumber: 'TXN-123',
          remarks: 'Bank keyed',
        }),
        'payment-key',
      ),
    )
    expect(onRecorded).toHaveBeenCalled()
  })

  it('focuses the field responsible for a validation error', () => {
    render(
      <RecordVendorPaymentModal visible payment={payment} onClose={vi.fn()} onRecorded={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Record Payment' }))

    const reference = screen.getByLabelText('Transaction reference')
    expect(reference).toHaveFocus()
    expect(screen.getByText('Transaction reference is required.')).toBeInTheDocument()
    expect(mocks.recordPayment).not.toHaveBeenCalled()
  })
})
