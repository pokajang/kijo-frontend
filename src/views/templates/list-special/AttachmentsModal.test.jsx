import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttachmentsModal from './AttachmentsModal'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))

vi.mock('../../../api/apiClient', () => ({ apiFetch: mocks.apiFetch }))

const pdfBlob = (signature = '%PDF-1.7') => ({
  slice: (start, end) => ({ text: () => Promise.resolve(signature.slice(start, end)) }),
})

const response = ({
  ok = true,
  contentType = 'application/pdf',
  payload = {},
  blob = pdfBlob(),
} = {}) => ({
  ok,
  headers: new Headers({ 'content-type': contentType }),
  blob: () => Promise.resolve(blob),
  clone: () => ({ json: () => Promise.resolve(payload) }),
})

beforeEach(() => {
  mocks.apiFetch.mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:attachment-preview')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('AttachmentsModal', () => {
  it('loads a signed PDF with authentication and previews the validated blob', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test/')
    mocks.apiFetch.mockResolvedValue(response())

    const attachments = [
      {
        id: 1,
        fileName: 'proposal.pdf',
        fileUrl: 'https://api.example.test/files/private/signed-token',
      },
    ]
    const { rerender } = render(
      <AttachmentsModal visible onClose={() => {}} attachments={attachments} />,
    )

    expect(await screen.findByTitle('proposal.pdf')).toHaveAttribute(
      'src',
      'blob:attachment-preview',
    )
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      'https://api.example.test/files/private/signed-token',
      expect.objectContaining({
        credentials: 'include',
        headers: { Accept: 'application/pdf' },
        silentError: true,
        signal: expect.any(AbortSignal),
      }),
    )
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'download',
      'proposal.pdf',
    )
    expect(screen.queryByText('This attachment URL cannot be previewed safely.')).toBeNull()

    rerender(<AttachmentsModal visible={false} onClose={() => {}} attachments={attachments} />)
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment-preview'))
  })

  it('rejects invalid PDF content and lets the user retry', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test/')
    mocks.apiFetch.mockResolvedValue(response({ blob: pdfBlob('not-a-pdf') }))

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

    expect(await screen.findByText('The attachment is not a valid PDF file.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(2))
  })

  it('blocks untrusted attachment origins without making a request', () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test/')

    render(
      <AttachmentsModal
        visible
        onClose={() => {}}
        attachments={[
          {
            id: 1,
            fileName: 'proposal.pdf',
            fileUrl: 'https://malicious.example/proposal.pdf',
          },
        ]}
      />,
    )

    expect(screen.getByText('This attachment URL cannot be previewed safely.')).toBeInTheDocument()
    expect(mocks.apiFetch).not.toHaveBeenCalled()
  })
})
