import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AttachmentsModal from './AttachmentsModal'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('AttachmentsModal', () => {
  it('previews a signed PDF served by the configured API origin', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test/')

    render(
      <AttachmentsModal
        visible
        onClose={() => {}}
        attachments={[
          {
            id: 1,
            fileName: 'proposal.pdf',
            fileUrl: 'https://api.example.test/files/private/signed-token',
          },
        ]}
      />,
    )

    expect(await screen.findByTitle('proposal.pdf')).toHaveAttribute(
      'src',
      'https://api.example.test/files/private/signed-token',
    )
    expect(screen.queryByText('This attachment URL cannot be previewed safely.')).toBeNull()
  })
})
