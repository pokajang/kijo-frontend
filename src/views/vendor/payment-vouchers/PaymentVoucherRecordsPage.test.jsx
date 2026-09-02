import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentVoucherRecordsPage from './PaymentVoucherRecordsPage'

const mocks = vi.hoisted(() => ({
  download: vi.fn().mockResolvedValue('voucher.pdf'),
  fetchVouchers: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({ default: () => <nav /> }))
vi.mock('../payment-records/vendorPaymentApi', () => ({
  fetchVendorPaymentVouchers: mocks.fetchVouchers,
}))
vi.mock('../../../utils/downloadAuthenticatedFile', () => ({
  downloadAuthenticatedFile: mocks.download,
}))
vi.mock('../../../api/apiClient', () => ({ showApiToast: mocks.toast }))
vi.mock('../../../utils/dateInputValues', () => ({
  toLocalMonthInputValue: () => '2026-08',
}))
vi.mock('../../../utils/assetUrls', () => ({ resolveAssetUrl: (value) => value }))
vi.mock('../pay/VendorPaymentVoucherPreview', () => ({
  default: ({ visible, documentState }) =>
    visible ? <div data-testid="voucher-preview">{documentState}</div> : null,
}))

const paidVoucher = {
  id: 7,
  vendor_payment_id: 42,
  voucher_number: 'PV-2026-000007',
  issued_at: '2026-08-30 09:00:00',
  vendor_name: 'Longstanding Vendor Sdn Bhd',
  project_or_context: 'Project Alpha deposit',
  amount: 1250,
  payment_status: 'Paid',
  voucher_status: 'Paid',
  document_state: 'paid',
  pdf_url: '/vendor-payments/42/voucher/pdf',
  paid_pdf_url: '/vendor-payments/42/voucher/paid-pdf',
}

describe('PaymentVoucherRecordsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchVouchers.mockResolvedValue({
      data: [paidVoucher],
      pagination: { current_page: 1, last_page: 1, total: 1 },
    })
    mocks.download.mockClear()
    mocks.toast.mockClear()
  })

  afterEach(cleanup)

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PaymentVoucherRecordsPage />
      </MemoryRouter>,
    )

  it('uses the local month and provides a deliberate mobile record representation', async () => {
    renderPage()

    await waitFor(() => expect(mocks.fetchVouchers).toHaveBeenCalled())
    expect(mocks.fetchVouchers).toHaveBeenLastCalledWith(
      expect.objectContaining({ month: '2026-08' }),
    )
    expect(screen.getAllByText('Longstanding Vendor Sdn Bhd')).toHaveLength(2)
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeEnabled()
  })

  it('downloads the most complete single-voucher copy directly from the archive', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2))

    fireEvent.click(screen.getAllByRole('button', { name: 'Download' })[0])

    await waitFor(() =>
      expect(mocks.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: paidVoucher.paid_pdf_url,
          expectedType: 'pdf',
          fallbackFilename: 'PV-2026-000007-PAID.pdf',
        }),
      ),
    )
    expect(mocks.toast).toHaveBeenCalledWith('PV-2026-000007 downloaded.')
  })

  it('clears the default month so finance can see the complete archive', async () => {
    renderPage()
    await waitFor(() => expect(mocks.fetchVouchers).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() =>
      expect(mocks.fetchVouchers).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ month: expect.anything() }),
      ),
    )
    expect(screen.getByText('All issuance months')).toBeInTheDocument()
  })
})
