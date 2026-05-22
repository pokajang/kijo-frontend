import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentRecords from './PaymentRecords'
import dialog from '../../../components/dialog/dialogService'

vi.mock('./usePaymentData', () => ({
  default: () => ({
    staffRoles: ['Manager'],
    allPayments: [{ payment_id: 123 }],
    loading: false,
    reloadPayments: vi.fn(),
  }),
}))

vi.mock('./PaymentTable', () => ({
  default: ({ onApprove }) => (
    <button type="button" onClick={() => onApprove(123)}>
      approve
    </button>
  ),
}))

vi.mock('./PaymentViewModal', () => ({
  default: () => null,
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    confirm: vi.fn(),
    alert: vi.fn(),
  },
}))

describe('PaymentRecords', () => {
  const renderPaymentRecords = () =>
    render(
      <MemoryRouter>
        <PaymentRecords />
      </MemoryRouter>,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirm.mockResolvedValue(true)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('approves vendor payments with the backend PATCH route', async () => {
    renderPaymentRecords()

    fireEvent.click(screen.getByRole('button', { name: 'approve' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(global.fetch.mock.calls[0][0]).toContain('vendor-payments/123/approve')
    expect(global.fetch.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
    })
  })

  it('shows request payment as a card header action', () => {
    renderPaymentRecords()

    expect(screen.getByRole('button', { name: /request vendor payment/i })).toBeInTheDocument()
  })
})
