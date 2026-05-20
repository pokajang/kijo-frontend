import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCsrfToken } from '../../api/apiClient'
import SectionMailDiagnostics from './SectionMailDiagnostics'

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('SectionMailDiagnostics', () => {
  beforeEach(() => {
    setCsrfToken('csrf-test')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    setCsrfToken(null)
    vi.unstubAllGlobals()
  })

  it('sends only the recipient email and records a successful default email test', async () => {
    window.fetch.mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        message: 'Default system email sent.',
        data: {
          type: 'default',
          status: 'sent',
          from: 'kijo@work.amiosh.com',
          to: 'azam@example.test',
          completed_at: '2026-05-21T02:00:00.000000Z',
        },
      }),
    )

    render(<SectionMailDiagnostics />)

    fireEvent.change(screen.getByLabelText(/recipient email/i), {
      target: { value: 'azam@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send default email test/i }))

    expect(await screen.findAllByText('Default system email sent.')).not.toHaveLength(0)

    const [, init] = window.fetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ recipient_email: 'azam@example.test' })
    expect(screen.queryByLabelText(/subject/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/message/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('sent')).not.toHaveLength(0)
  })

  it('records blocked quote PDF tests using backend diagnostic metadata', async () => {
    window.fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          status: 'error',
          message:
            'Quotation email sender is configured as wrong@example.test, expected info.admin@amiosh.com.',
          data: {
            type: 'quote_pdf',
            status: 'blocked',
            from: 'wrong@example.test',
            expected_from: 'info.admin@amiosh.com',
            to: 'azam@example.test',
            attachment: 'quote-mail-diagnostic.pdf',
            completed_at: '2026-05-21T02:01:00.000000Z',
          },
        },
        503,
      ),
    )

    render(<SectionMailDiagnostics />)

    fireEvent.change(screen.getByLabelText(/recipient email/i), {
      target: { value: 'azam@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send quote pdf email test/i }))

    expect(await screen.findAllByText(/configured as wrong@example.test/i)).not.toHaveLength(0)

    await waitFor(() => {
      expect(screen.getAllByText('blocked')).not.toHaveLength(0)
    })
    expect(screen.getByText('wrong@example.test')).toBeInTheDocument()
    expect(screen.getByText('quote-mail-diagnostic.pdf')).toBeInTheDocument()
  })
})
