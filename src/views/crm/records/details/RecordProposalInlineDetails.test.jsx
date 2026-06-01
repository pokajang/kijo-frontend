import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import RecordProposalInlineDetails from './RecordProposalInlineDetails'

afterEach(() => {
  cleanup()
})

describe('RecordProposalInlineDetails', () => {
  it('shows one proposal badge and the inline detail action when preview is supported', () => {
    render(
      <RecordProposalInlineDetails
        record={{
          proposal: {
            attachedToPdf: true,
            templateType: 'training',
            templateId: 21,
            title: 'Office Tinting Service',
            language: 'en',
            canPreviewInline: true,
          },
        }}
      />,
    )

    expect(screen.getByText('Office Tinting Service attached to this quote')).toBeInTheDocument()
    expect(screen.getAllByText(/attached to this quote|linked to this quote/i)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Show Detail Proposal' })).toBeInTheDocument()
  })

  it('hides the inline detail action when preview is not supported', () => {
    render(
      <RecordProposalInlineDetails
        record={{
          proposal: {
            attachedToPdf: true,
            templateType: null,
            templateId: null,
            title: null,
            language: null,
            canPreviewInline: false,
          },
        }}
      />,
    )

    expect(screen.getByText('Proposal attached to this quote')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show Detail Proposal' })).not.toBeInTheDocument()
  })
})
