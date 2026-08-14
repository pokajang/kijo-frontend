import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import RecordDetailsActions from './RecordDetailsActions'

vi.mock('../../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { staff_id: 51 } }),
}))

const actions = {
  handlers: {
    handleGeneratePdf: vi.fn(),
    handleGenerateWord: vi.fn(),
    handleEdit: vi.fn(),
    handleRevise: vi.fn(),
  },
  isAwarded: false,
  isSyncingClient: false,
  onEmail: vi.fn(),
  onSharePdf: vi.fn(),
  onFollowUp: vi.fn(),
  onUnAward: vi.fn(),
  onReAward: vi.fn(),
  onChangeToSuccess: vi.fn(),
  onChangeToFail: vi.fn(),
  onSyncClient: vi.fn(),
  onDelete: vi.fn(),
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RecordDetailsActions issuance safeguards', () => {
  it('disables issuance actions and explains a pending approval', () => {
    render(
      <RecordDetailsActions
        {...actions}
        serviceTab="equipment-tab"
        record={{
          id: 30,
          clientDetails: { email: 'client@example.test' },
          approval: { can_issue: false, status: 'pending', required_step: 'bd' },
        }}
      />,
    )

    expect(screen.getByText(/BD approval is pending/i)).toBeInTheDocument()
    for (const name of ['Email', 'Share PDF', 'Generate PDF', 'Generate Word', 'Awarded']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Failed' })).toBeEnabled()
  })

  it('keeps issuance actions available for a green quotation', () => {
    render(
      <RecordDetailsActions
        {...actions}
        serviceTab="equipment-tab"
        record={{
          id: 31,
          estimatedCost: 100,
          grandTotal: 150,
          clientDetails: { email: 'client@example.test' },
        }}
      />,
    )

    expect(screen.queryByText(/Quote issuance unavailable/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate PDF' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Generate Word' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Share PDF' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Awarded' })).toBeEnabled()
  })

  it.each(['training-tab', 'ih-tab', 'manpower-tab', 'special-tab'])(
    'shows Generate Word for %s',
    (serviceTab) => {
      render(
        <RecordDetailsActions
          {...actions}
          serviceTab={serviceTab}
          record={{ id: 32, serviceTab, estimatedCost: 100, grandTotal: 150 }}
        />,
      )

      expect(screen.getByRole('button', { name: 'Generate Word' })).toBeEnabled()
    },
  )
})
