import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VendorPaymentInvoicePreview from './VendorPaymentInvoicePreview'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))

vi.mock('../../../api/apiClient', () => ({ apiFetch: mocks.apiFetch }))

vi.mock('@coreui/react', () => ({
  CAlert: ({ children }) => <div role="alert">{children}</div>,
  CButton: ({ children, as, ...props }) =>
    as === 'a' ? <a {...props}>{children}</a> : <button {...props}>{children}</button>,
  CModal: ({ children, visible }) => (visible ? <div role="dialog">{children}</div> : null),
  CModalBody: ({ children }) => <div>{children}</div>,
  CModalFooter: ({ children }) => <footer>{children}</footer>,
  CModalHeader: ({ children }) => <header>{children}</header>,
  CModalTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  CSpinner: () => <span>spinner</span>,
}))

const previewBlob = (signature = '%PDF-') => ({
  slice: () => ({ text: () => Promise.resolve(signature) }),
})

const response = ({
  ok = true,
  status = 200,
  type = 'application/pdf',
  blob = previewBlob(),
} = {}) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': type }),
  blob: () => Promise.resolve(blob),
  clone() {
    return this
  },
  json: () => Promise.resolve({}),
})

describe('VendorPaymentInvoicePreview', () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:invoice-preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => cleanup())

  it('fetches a relative endpoint with credentials and renders a validated PDF blob', async () => {
    mocks.apiFetch.mockResolvedValue(response())

    const { unmount } = render(
      <VendorPaymentInvoicePreview
        visible
        onClose={() => {}}
        url="/proxy/vendor-payments/42/invoice"
        originalName="invoice.pdf"
      />,
    )

    expect(screen.getByText('Loading invoice…')).toBeInTheDocument()
    expect(await screen.findByTitle('Invoice Preview Document')).toHaveAttribute(
      'src',
      'blob:invoice-preview',
    )
    expect(screen.getByText(/PDF loaded/i)).toBeInTheDocument()
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      '/proxy/vendor-payments/42/invoice',
      expect.objectContaining({ credentials: 'include', silentError: true }),
    )
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'download',
      'invoice.pdf',
    )

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:invoice-preview')
  })

  it('shows an actionable missing-file error and retries', async () => {
    mocks.apiFetch
      .mockResolvedValueOnce(response({ ok: false, status: 404 }))
      .mockResolvedValueOnce(response())

    render(
      <VendorPaymentInvoicePreview
        visible
        onClose={() => {}}
        url="/proxy/vendor-payments/42/invoice"
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The invoice attachment could not be found.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(2))
    expect(await screen.findByTitle('Invoice Preview Document')).toBeInTheDocument()
  })

  it('rejects a response labelled as PDF when its bytes are not a PDF', async () => {
    mocks.apiFetch.mockResolvedValue(response({ blob: previewBlob('not a') }))

    render(
      <VendorPaymentInvoicePreview
        visible
        onClose={() => {}}
        url="/proxy/vendor-payments/42/invoice"
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('not a valid PDF')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
