import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import HandbookAcknowledgementForm from '../components/HandbookAcknowledgementForm'
import dialog from '../../../components/dialog/dialogService'
import { signHandbook } from '../api/handbookApi'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../api/handbookApi', () => ({
  signHandbook: vi.fn(),
}))

describe('HandbookAcknowledgementForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('submits trimmed values and notifies the parent after signing', async () => {
    const onSigned = vi.fn()
    dialog.confirm.mockResolvedValue(true)
    signHandbook.mockResolvedValue({
      success: true,
      message: 'Signed',
      data: { signed_at: '2026-05-08 10:00:00' },
    })

    render(
      <HandbookAcknowledgementForm
        version={{ id: 12, version_label: 'V5 - 2026-05-08' }}
        onSigned={onSigned}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge & Sign' }))
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: '  Jane Doe  ' },
    })
    fireEvent.change(screen.getByLabelText('IC Number'), {
      target: { value: '  900101-01-1234  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(signHandbook).toHaveBeenCalledWith({
        fullName: 'Jane Doe',
        icNumber: '900101-01-1234',
        versionId: 12,
      })
    })
    expect(onSigned).toHaveBeenCalledWith({
      signed_at: '2026-05-08 10:00:00',
      full_name: 'Jane Doe',
    })
  })

  it('shows signed confirmation instead of the sign action after current version endorsement', () => {
    render(
      <HandbookAcknowledgementForm
        signature={{
          signed: true,
          full_name: 'Jane Doe',
          signed_at: '2026-05-08 10:00:00',
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Acknowledge & Sign' })).not.toBeInTheDocument()
    expect(screen.getByText(/Signed by Jane Doe on/i)).toBeInTheDocument()
  })

  it('blocks duplicate submits while confirmation is pending', async () => {
    dialog.confirm.mockImplementation(() => new Promise(() => {}))

    render(<HandbookAcknowledgementForm version={{ id: 12, version_label: 'V5 - 2026-05-08' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge & Sign' }))
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Jane Doe' },
    })
    fireEvent.change(screen.getByLabelText('IC Number'), {
      target: { value: '900101-01-1234' },
    })

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(dialog.confirm).toHaveBeenCalledTimes(1)
    })
    expect(signHandbook).not.toHaveBeenCalled()
  })

  it('disables signing until a handbook version is available', () => {
    render(
      <HandbookAcknowledgementForm disabledMessage="Server copy is required before signing." />,
    )

    const signButton = screen.getByRole('button', { name: 'Acknowledge & Sign' })
    expect(signButton).toBeDisabled()
    expect(screen.getByText('Server copy is required before signing.')).toBeInTheDocument()
  })
})
