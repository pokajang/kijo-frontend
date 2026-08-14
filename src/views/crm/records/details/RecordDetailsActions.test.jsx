import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import RecordDetailsActions from './RecordDetailsActions'

vi.mock('../../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { staff_id: 51 } }),
}))

const actions = {
  handlers: { handleGeneratePdf: vi.fn(), handleEdit: vi.fn(), handleRevise: vi.fn() },
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
        record={{
          id: 30,
          serviceTab: 'equipment-tab',
          clientDetails: { email: 'client@example.test' },
          approval: { can_issue: false, status: 'pending', required_step: 'bd' },
        }}
      />,
    )

    expect(screen.getByText(/BD approval is pending/i)).toBeInTheDocument()
    for (const name of ['Email', 'Share PDF', 'Generate Quote', 'Awarded']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Failed' })).toBeEnabled()
  })

  it('keeps issuance actions available for a green quotation', () => {
    render(
      <RecordDetailsActions
        {...actions}
        record={{
          id: 31,
          serviceTab: 'equipment-tab',
          estimatedCost: 100,
          grandTotal: 150,
          clientDetails: { email: 'client@example.test' },
        }}
      />,
    )

    expect(screen.queryByText(/Quote issuance unavailable/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate Quote' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Share PDF' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Awarded' })).toBeEnabled()
  })

  it('keeps Generate Quote available as the direct recovery route for a missing current cost', () => {
    render(
      <RecordDetailsActions
        {...actions}
        record={{
          id: 32,
          serviceTab: 'equipment-tab',
          issuanceContext: { estimated_cost_required: true },
          clientDetails: { email: 'client@example.test' },
        }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Generate Quote' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Email' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share PDF' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Awarded' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
  })
})
