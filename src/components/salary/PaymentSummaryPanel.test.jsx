import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PaymentSummaryPanel from './PaymentSummaryPanel'

const storageMock = vi.hoisted(() => ({
  checkPaymentSummaryReadiness: vi.fn(),
  fetchPaymentSummaries: vi.fn(),
  fetchPaymentSummary: vi.fn(),
  getFinancePaymentSummaryAttachmentUrl: vi.fn(),
  issuePaymentSummary: vi.fn(),
  preparePaymentSummary: vi.fn(),
  resendPaymentSummary: vi.fn(),
  revokePaymentSummary: vi.fn(),
}))

vi.mock('./paymentSummaryStorage', () => storageMock)

describe('PaymentSummaryPanel', () => {
  const records = [
    {
      id: 12,
      reference: 'PAY-202608-R02',
      paymentPeriod: '2026-08',
      revision: 2,
      recipientName: 'Amin Rozak',
      status: 'Issued',
      grandTotal: 12345.67,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.fetchPaymentSummaries.mockResolvedValue({
      records,
      defaults: { recipientEmail: 'aminrozak@amiosh.com', recipientName: 'Amin Rozak' },
    })
    storageMock.fetchPaymentSummary.mockResolvedValue({})
    storageMock.resendPaymentSummary.mockResolvedValue({ message: 'Secure link resent.' })
  })

  afterEach(cleanup)

  it('renders a readable mobile summary card alongside the desktop table', async () => {
    render(<PaymentSummaryPanel />)

    expect(
      await screen.findByRole('button', { name: 'Preview payment summary PAY-202608-R02' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('PAY-202608-R02')).toHaveLength(2)
    expect(screen.getAllByText('Amin Rozak')).toHaveLength(2)
    expect(screen.getAllByText('RM 12,345.67')).toHaveLength(2)
  })

  it('opens the selected summary from the mobile card and preserves lifecycle actions', async () => {
    render(<PaymentSummaryPanel />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Preview payment summary PAY-202608-R02' }),
    )
    await waitFor(() => expect(storageMock.fetchPaymentSummary).toHaveBeenCalledWith(12))

    fireEvent.click(screen.getAllByRole('button', { name: 'Resend' }).at(-1))
    await waitFor(() => expect(storageMock.resendPaymentSummary).toHaveBeenCalledWith(12))
  })
})
