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
  default: ({ onCheck, onApprove, busyPaymentIds }) => (
    <>
      <button type="button" disabled={busyPaymentIds.has('123')} onClick={() => onCheck(123)}>
        review
      </button>
      <button type="button" disabled={busyPaymentIds.has('123')} onClick={() => onApprove(123)}>
        approve
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

  it('uses review terminology when reviewing a payment', async () => {
    dialog.prompt.mockResolvedValueOnce('Review complete')
    renderPaymentRecords()

    fireEvent.click(screen.getByRole('button', { name: 'review' }))

    await waitFor(() => expect(findFetchCall('vendor-payments/123/check')).toBeTruthy())
    expect(dialog.prompt).toHaveBeenCalledWith(
      'Review remarks',
      expect.objectContaining({ multiline: true }),
    )
    expect(JSON.parse(findFetchCall('vendor-payments/123/check')[1].body)).toEqual({
      remarks: 'Review complete',
    })
  })

  it('locks only the active payment while its workflow request is running', async () => {
    let resolveRequest
    global.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ status: 'success' }),
            })
        }),
    )
    renderPaymentRecords()

    const approveButton = screen.getByRole('button', { name: 'approve' })
    fireEvent.click(approveButton)

    await waitFor(() => expect(approveButton).toBeDisabled())
    fireEvent.click(approveButton)
    expect(
      global.fetch.mock.calls.filter(([url]) =>
        String(url).includes('vendor-payments/123/approve'),
      ),
    ).toHaveLength(1)

    resolveRequest()
    await waitFor(() => expect(approveButton).not.toBeDisabled())
  })

  it('shows request payment as a card header action', () => {
    renderPaymentRecords()

    expect(screen.getByRole('button', { name: /request vendor payment/i })).toBeInTheDocument()
  })
})
