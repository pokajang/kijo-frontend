import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import QuotationPdfPreviewModal from './QuotationPdfPreviewModal'

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

const request = (overrides = {}) => ({
  url: '/api/quote-records/training/68/pdf',
  record: { id: 68, quotationId: 'QTR26-0068' },
  onLoadSuccess: vi.fn(),
  onApprovalStateChanged: vi.fn(),
  ...overrides,
})

describe('QuotationPdfPreviewModal', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:quotation-preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => cleanup())

  it('shows a preview and an explicit deterministic download action', async () => {
    const previewRequest = request()
    const loadPdf = vi.fn().mockResolvedValue({
      blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      filename: 'QTR26-0068_Client_A.pdf',
    })

    const { unmount } = render(
      <QuotationPdfPreviewModal
        visible
        request={previewRequest}
        onClose={() => {}}
        loadPdf={loadPdf}
      />,
    )

    expect(screen.getByText('Generating quotation PDF…')).toBeInTheDocument()
    expect(await screen.findByTitle('Quotation PDF preview')).toHaveAttribute(
      'src',
      'blob:quotation-preview',
    )
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'download',
      'QTR26-0068_Client_A.pdf',
    )
    expect(loadPdf).toHaveBeenCalledTimes(1)
    expect(previewRequest.onLoadSuccess).toHaveBeenCalledTimes(1)

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:quotation-preview')
  })

  it('shows an actionable error and retries without opening a popup', async () => {
    const loadPdf = vi
      .fn()
      .mockRejectedValueOnce(new Error('The quotation PDF response was invalid.'))
      .mockResolvedValueOnce({
        blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
        filename: 'quotation-68.pdf',
      })

    render(
      <QuotationPdfPreviewModal visible request={request()} onClose={() => {}} loadPdf={loadPdf} />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('response was invalid')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByTitle('Quotation PDF preview')).toBeInTheDocument()
    expect(loadPdf).toHaveBeenCalledTimes(2)
  })

  it('refreshes approval state after an approval-blocked response', async () => {
    const previewRequest = request()
    const error = Object.assign(new Error('BD approval is pending.'), {
      status: 409,
      data: { approval: { id: 91, can_issue: false } },
    })

    render(
      <QuotationPdfPreviewModal
        visible
        request={previewRequest}
        onClose={() => {}}
        loadPdf={vi.fn().mockRejectedValue(error)}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('BD approval is pending')
    expect(previewRequest.onApprovalStateChanged).toHaveBeenCalledWith(error.data)
  })

  it('aborts an unfinished request when the modal unmounts', async () => {
    let capturedSignal
    const loadPdf = vi.fn(({ signal }) => {
      capturedSignal = signal
      return new Promise(() => {})
    })

    const { unmount } = render(
      <QuotationPdfPreviewModal visible request={request()} onClose={() => {}} loadPdf={loadPdf} />,
    )

    await waitFor(() => expect(capturedSignal).toBeDefined())
    unmount()
    expect(capturedSignal.aborted).toBe(true)
  })
})
