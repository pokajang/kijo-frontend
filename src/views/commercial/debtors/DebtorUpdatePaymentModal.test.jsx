import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchJson } from '../../../utils/detailPages'
import DebtorUpdatePaymentModal from './DebtorUpdatePaymentModal'

vi.mock('../../../utils/detailPages', () => ({
  fetchJson: vi.fn(),
}))

const debtor = {
  sourceType: 'manual',
  sourceId: 7,
  invoiceRef: 'MAN-007',
  client: 'Example Client',
  grandTotal: 1000,
  paidTotal: 300,
  outstandingAmount: 700,
  paymentStatus: 'Partially Paid',
}

describe('DebtorUpdatePaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchJson.mockResolvedValue({
      status: 'success',
      summary: {
        grandTotal: 1000,
        paidTotal: 300,
        outstandingAmount: 700,
        paymentStatus: 'Partially Paid',
      },
      payments: [
        {
          id: 11,
          amount: 300,
          paymentDate: '2026-08-01',
          paymentMethod: 'Bank Transfer',
          transactionReference: 'TX-11',
          recordedByCode: 'EMP',
          reversedAt: null,
        },
      ],
    })
  })

  afterEach(() => cleanup())

  it('records either the full outstanding balance or an explicit partial amount', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true)
    render(
      <DebtorUpdatePaymentModal
        visible
        debtor={debtor}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onReverse={vi.fn()}
      />,
    )

    await screen.findByText(/TX-11/)
    expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining('receivables/manual/7/payments'))
    expect(screen.getByText('RM 700.00')).toBeInTheDocument()

    const amountInput = screen.getByLabelText('Amount received now')
    expect(amountInput).toBeDisabled()
    expect(amountInput).toHaveValue(700)

    fireEvent.click(screen.getByLabelText('Partial payment'))
    expect(amountInput).not.toBeDisabled()
    fireEvent.change(amountInput, { target: { value: '250.50' } })
    fireEvent.change(screen.getByLabelText('Transaction reference'), {
      target: { value: 'TX-22' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update Payment' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      payment_type: 'partial',
      amount: '250.50',
      transaction_reference: 'TX-22',
    })
    expect(onConfirm.mock.calls[0][0].request_token).toBeTruthy()
  })

  it('shows payment history and delegates reversal', async () => {
    const onReverse = vi.fn().mockResolvedValue(true)
    render(
      <DebtorUpdatePaymentModal
        visible
        debtor={debtor}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReverse={onReverse}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Reverse' }))
    await waitFor(() => expect(onReverse).toHaveBeenCalledWith(expect.objectContaining({ id: 11 })))
    await waitFor(() => expect(fetchJson).toHaveBeenCalledTimes(2))
  })

  it('blocks an amount above the outstanding balance before submission', async () => {
    const onConfirm = vi.fn()
    render(
      <DebtorUpdatePaymentModal
        visible
        debtor={debtor}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onReverse={vi.fn()}
      />,
    )

    await screen.findByText(/TX-11/)
    fireEvent.click(screen.getByLabelText('Partial payment'))
    fireEvent.change(screen.getByLabelText('Amount received now'), { target: { value: '701' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Payment' }))

    expect(
      await screen.findByText('Partial payment cannot exceed the outstanding balance.'),
    ).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
