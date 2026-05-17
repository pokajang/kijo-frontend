import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirm.mockResolvedValue(true)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })
  })

  it('approves vendor payments with the backend PATCH route', async () => {
    render(<PaymentRecords />)

    fireEvent.click(screen.getByRole('button', { name: 'approve' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(global.fetch.mock.calls[0][0]).toContain('vendor-payments/123/approve')
    expect(global.fetch.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
    })
  })
})
