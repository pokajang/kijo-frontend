import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentRecords from './PaymentRecords'
import dialog from '../../../components/dialog/dialogService'
import { setCsrfToken } from '../../../api/apiClient'

vi.mock('./usePaymentData', () => ({
  default: () => ({
    staffRoles: ['Manager'],
    allPayments: [{ id: 123, status: 'Checked' }],
    loading: false,
    reloadPayments: vi.fn(),
  }),
}))

vi.mock('./PaymentTable', () => ({
  default: ({ onApprove, onMarkPaid }) => (
    <>
      <button type="button" onClick={() => onApprove(123)}>
        approve
      </button>
      <button
        type="button"
        onClick={() => onMarkPaid({ id: 456, amount: 125, status: 'Approved' })}
      >
        mark paid
      </button>
    </>
  ),
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    confirm: vi.fn(),
    alert: vi.fn(),
    prompt: vi.fn(),
  },
}))

describe('PaymentRecords', () => {
  const renderPaymentRecords = () =>
    render(
      <MemoryRouter>
        <PaymentRecords />
      </MemoryRouter>,
    )

  const findFetchCall = (needle) =>
    global.fetch.mock.calls.find(([url]) => String(url).includes(needle))

  beforeEach(() => {
    vi.clearAllMocks()
    setCsrfToken('csrf-test')
    dialog.confirm.mockResolvedValue(true)
    dialog.prompt.mockResolvedValue('')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })
  })

  afterEach(() => {
    setCsrfToken(null)
    cleanup()
  })

  it('approves vendor payments with the backend PATCH route', async () => {
    renderPaymentRecords()

    fireEvent.click(screen.getByRole('button', { name: 'approve' }))

    await waitFor(() => expect(findFetchCall('vendor-payments/123/approve')).toBeTruthy())
    const approveCall = findFetchCall('vendor-payments/123/approve')
    expect(approveCall[1]).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
    })
  })

  it('shows request payment as a card header action', () => {
    renderPaymentRecords()

    expect(screen.getByRole('button', { name: /request vendor payment/i })).toBeInTheDocument()
  })

  it('prompts finance for the final paid amount before marking paid', async () => {
    dialog.prompt
      .mockResolvedValueOnce('2026-05-29')
      .mockResolvedValueOnce('121.50')
      .mockResolvedValueOnce('Bank keyed')

    renderPaymentRecords()

    fireEvent.click(screen.getByRole('button', { name: 'mark paid' }))

    await waitFor(() => expect(findFetchCall('vendor-payments/456/mark-paid')).toBeTruthy())
    const markPaidCall = findFetchCall('vendor-payments/456/mark-paid')
    expect(JSON.parse(markPaidCall[1].body)).toMatchObject({
      paid_date: '2026-05-29',
      paid_amount: 121.5,
      remarks: 'Bank keyed',
    })
  })
})
