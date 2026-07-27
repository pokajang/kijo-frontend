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

const declarations = [
  {
    id: 'handbook_receipt',
    title: 'Handbook Receipt',
    body: 'I received and reviewed this handbook.',
    required: true,
    order: 1,
  },
  {
    id: 'salary_deduction_consent',
    title: 'Salary Deduction Consent',
    body: 'I give the consent stated in this handbook.',
    required: true,
    order: 2,
  },
  {
    id: 'confidentiality_ai_boundaries',
    title: 'Confidentiality and AI Boundaries',
    body: 'I accept the confidentiality requirements.',
    required: true,
    order: 3,
  },
  {
    id: 'electronic_signature_validation',
    title: 'Electronic Signature Validation',
    body: 'I intend this submission to be my electronic signature.',
    required: true,
    order: 4,
  },
]

const readyProps = {
  version: { id: 12, version_label: 'V5 - 2026-05-08' },
  acknowledgement: { schemaVersion: 2, declarations },
  signingContext: {
    available: true,
    acknowledgement_sha256: 'a'.repeat(64),
    profile: {
      full_name: 'Jane Doe',
      identity_number: '900101-01-1234',
      identity_number_masked: '••••••••••1234',
      employee_code: 'ST7',
      designation: 'Safety Executive',
      department: 'Operations',
    },
    personal_signature: {
      available: true,
      url: '/files/private/signature',
      sha256: 'b'.repeat(64),
    },
  },
}

const openAndCompleteForm = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Review & Sign' }))
  declarations.forEach((declaration) => {
    fireEvent.click(screen.getByRole('checkbox', { name: declaration.title }))
  })
  fireEvent.change(screen.getByLabelText('Type Your Full Name Exactly as Shown Above'), {
    target: { value: '  Jane Doe  ' },
  })
}

describe('HandbookAcknowledgementForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('submits all declaration and signature evidence and notifies the parent', async () => {
    const onSigned = vi.fn()
    dialog.confirm.mockResolvedValue(true)
    signHandbook.mockResolvedValue({
      success: true,
      message: 'Signed',
      data: { signed_at: '2026-05-08T10:00:00+08:00' },
    })

    render(<HandbookAcknowledgementForm {...readyProps} onSigned={onSigned} />)
    openAndCompleteForm()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Electronic Signature' }))

    await waitFor(() => {
      expect(signHandbook).toHaveBeenCalledWith({
        submission_uuid: expect.any(String),
        handbook_version_id: 12,
        typed_legal_name: 'Jane Doe',
        accepted_declaration_ids: declarations.map((declaration) => declaration.id),
        acknowledgement_sha256: 'a'.repeat(64),
        personal_signature_sha256: 'b'.repeat(64),
      })
    })
    expect(onSigned).toHaveBeenCalledWith({
      signed_at: '2026-05-08T10:00:00+08:00',
      full_name: 'Jane Doe',
    })
  })

  it('shows electronic signature confirmation after current version endorsement', () => {
    render(
      <HandbookAcknowledgementForm
        signature={{
          signed: true,
          full_name: 'Jane Doe',
          signed_at: '2026-05-08T10:00:00+08:00',
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Review & Sign' })).not.toBeInTheDocument()
    expect(screen.getByText('Electronically signed')).toBeInTheDocument()
    expect(screen.getByText(/Signed by Jane Doe on/i)).toBeInTheDocument()
  })

  it('blocks duplicate submits while confirmation is pending', async () => {
    dialog.confirm.mockImplementation(() => new Promise(() => {}))
    render(<HandbookAcknowledgementForm {...readyProps} />)
    openAndCompleteForm()

    const submitButton = screen.getByRole('button', { name: 'Submit Electronic Signature' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(dialog.confirm).toHaveBeenCalledTimes(1)
    })
    expect(signHandbook).not.toHaveBeenCalled()
  })

  it('requires every checkbox, exact profile name, and a saved signature', () => {
    render(<HandbookAcknowledgementForm {...readyProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review & Sign' }))

    expect(screen.getByDisplayValue('900101-01-1234')).toBeInTheDocument()
    const submitButton = screen.getByRole('button', { name: 'Submit Electronic Signature' })
    expect(submitButton).toBeDisabled()

    declarations.forEach((declaration) => {
      fireEvent.click(screen.getByRole('checkbox', { name: declaration.title }))
    })
    fireEvent.change(screen.getByLabelText('Type Your Full Name Exactly as Shown Above'), {
      target: { value: 'Jane Other' },
    })
    expect(submitButton).toBeDisabled()
    expect(
      screen.getByText('Enter your full name exactly as shown in the profile above.'),
    ).toBeInTheDocument()
  })

  it('falls back to signature upload when the saved signature image cannot be loaded', () => {
    render(<HandbookAcknowledgementForm {...readyProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review & Sign' }))

    fireEvent.error(screen.getByAltText('Selected personal signature'))

    expect(screen.getByText(/saved signature could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Upload Personal Signature')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Electronic Signature' })).toBeDisabled()
  })

  it('disables signing until a current evidence-enabled version is available', () => {
    render(
      <HandbookAcknowledgementForm disabledMessage="Server copy is required before signing." />,
    )

    const signButton = screen.getByRole('button', { name: 'Review & Sign' })
    expect(signButton).toBeDisabled()
    expect(screen.getByText('Server copy is required before signing.')).toBeInTheDocument()
  })
})
