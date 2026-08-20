import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AttachmentPreviewModal } from './ClaimFormPrimitives'

describe('AttachmentPreviewModal', () => {
  afterEach(cleanup)

  it('previews a local PDF inline', () => {
    render(
      <AttachmentPreviewModal
        attachment={{
          name: 'receipt.pdf',
          type: 'application/pdf',
          dataUrl: 'data:application/pdf;base64,cGRm',
        }}
        onClose={() => {}}
      />,
    )

    expect(screen.getByTitle('receipt.pdf')).toHaveAttribute(
      'src',
      'data:application/pdf;base64,cGRm',
    )
  })

  it('opens a server-hosted PDF in a new tab instead of iframing it', () => {
    render(
      <AttachmentPreviewModal
        attachment={{
          name: 'receipt.pdf',
          type: 'application/pdf',
          url: 'https://api.example/receipt',
        }}
        onClose={() => {}}
      />,
    )

    expect(screen.queryByTitle('receipt.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open PDF in new tab' })).toHaveAttribute(
      'href',
      'https://api.example/receipt',
    )
  })
})
