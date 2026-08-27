import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OtherClaimRecordDetailPage from './OtherClaimRecordDetailPage'

const storageMock = vi.hoisted(() => ({
  findOtherClaimRecordByUrlKey: vi.fn(),
}))

vi.mock('./otherClaimRecordStorage', () => ({
  findOtherClaimRecordByUrlKey: storageMock.findOtherClaimRecordByUrlKey,
  archiveOtherClaimRecord: vi.fn(),
  deleteOtherClaimRecord: vi.fn(),
  withdrawOtherClaimRecord: vi.fn(),
}))

vi.mock('../../notifications/AppNotificationProvider', () => ({
  useAppNotifications: () => ({ consumeEntity: vi.fn().mockResolvedValue(undefined) }),
}))

describe('OtherClaimRecordDetailPage', () => {
  beforeEach(() => {
    storageMock.findOtherClaimRecordByUrlKey.mockResolvedValue({
      id: 10,
      claimReference: 'OCA-00010',
      revisionNo: 1,
      status: 'Submitted',
      submittedAt: '2026-08-21T09:00:00',
      claimsTotal: 50,
      claims: [{ id: 'allowance-1', type: 'Allowance', description: 'Parking', amount: 50 }],
      workflow: { history: [] },
      auditEvents: [],
      paymentHistory: [],
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opts into the mobile-flat detail shell', async () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/other-claims/records/10']}>
        <Routes>
          <Route
            path="/my/salary/other-claims/records/:otherClaimRecordId"
            element={<OtherClaimRecordDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('OCA-00010')).toBeInTheDocument()
    })

    expect(document.querySelector('.data-table-detail-shell')).toHaveClass(
      'data-table-detail-shell--mobile-flat',
    )
  })
})
