import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OtherClaimRecords from './OtherClaimRecords'

const storageMock = vi.hoisted(() => ({
  getOtherClaimRecords: vi.fn(),
}))

vi.mock('../../notifications/AppNotificationProvider', () => ({
  useAppNotifications: () => ({ consumeRouteGroup: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('./otherClaimRecordStorage', () => ({
  archiveOtherClaimRecord: vi.fn(),
  deleteOtherClaimRecord: vi.fn(),
  exportOtherClaimPdf: vi.fn(),
  findOtherClaimRecord: vi.fn(),
  getOtherClaimRecordUrlKey: (record) => record.id,
  getOtherClaimRecords: storageMock.getOtherClaimRecords,
  otherClaimRecordsChangedEvent: 'other-claim-records-changed',
  withdrawOtherClaimRecord: vi.fn(),
}))

vi.mock('./otherClaimDraftStorage', () => ({ clearOtherClaimDraft: vi.fn() }))

describe('OtherClaimRecords', () => {
  beforeEach(() => {
    storageMock.getOtherClaimRecords.mockResolvedValue([
      {
        id: 19,
        claimMonth: 'August 2026',
        claimMonthValue: '2026-08',
        claimsTotal: 125,
        status: 'Rejected',
      },
    ])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('presents rejected claims as a final decision rather than an action needed', async () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/other-claims/records']}>
        <OtherClaimRecords />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('final decision')).toBeInTheDocument())
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0)
    expect(screen.queryByText('Action Needed')).not.toBeInTheDocument()
    expect(screen.queryByText('revise rejected claims')).not.toBeInTheDocument()
  })
})
