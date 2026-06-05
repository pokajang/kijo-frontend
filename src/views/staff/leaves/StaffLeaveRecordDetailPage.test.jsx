import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StaffLeaveRecordDetailPage from './StaffLeaveRecordDetailPage'
import * as AH from './actionHandlers'

vi.mock('./actionHandlers', () => ({
  getAllLeaves: vi.fn(),
  leaveAction: vi.fn(),
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
  },
}))

const pastLeaveRecord = {
  id: 44,
  staff_id: 7,
  applicant_name: 'Azam Bin Husain',
  applicant_code: 'AZA',
  type: 'Annual',
  duration_days: 3,
  reason: 'Past annual leave',
  status: 'Approved',
  applied_at: '2025-05-20 09:15:00',
  start_date: '2025-06-01',
  start_time: '08:30',
  end_date: '2025-06-03',
  end_time: '17:30',
  reviewed_by: 30,
  reviewed_status: 'Recommended',
  reviewed_at: '2025-05-21 09:00:00',
  approved_status: 'Approved',
  approved_at: '2025-05-22 09:00:00',
}

const renderDetail = (state = {}) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/staff/leaves/records/44',
          state,
        },
      ]}
    >
      <Routes>
        <Route path="/staff/leaves/records/:leaveId" element={<StaffLeaveRecordDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('StaffLeaveRecordDetailPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('reloads HR leave detail using all-time records so past-year records remain visible', async () => {
    AH.getAllLeaves.mockResolvedValueOnce([pastLeaveRecord])

    renderDetail({ record: pastLeaveRecord })

    await waitFor(() => {
      expect(AH.getAllLeaves).toHaveBeenCalledWith({
        preset: 'all',
        startDate: '',
        endDate: '',
      })
    })

    expect(await screen.findByText('Past annual leave')).toBeInTheDocument()
    expect(screen.queryByText('Leave record not found.')).not.toBeInTheDocument()
  })
})
