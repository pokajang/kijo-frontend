import { describe, expect, it } from 'vitest'
import { mapPersonalLeave } from './LeaveRecordDetailPage'

describe('LeaveRecordDetailPage record mapping', () => {
  it('maps current cancellation actor details for the personal audit trail', () => {
    expect(
      mapPersonalLeave({
        id: 41,
        type: 'Annual',
        duration_days: '1.00',
        status: 'Cancelled',
        canceller_name: 'HR User',
        canceller_code: 'HR1',
        cancelled_by: 20,
        cancelled_at: '2026-09-07 10:30:00',
      }),
    ).toMatchObject({
      id: 41,
      leaveType: 'Annual',
      duration: '1.00',
      cancelledBy: 'HR User (HR1)',
      cancelledAt: '2026-09-07 10:30:00',
    })
  })

  it('keeps legacy camel-case records and numeric cancellation actors readable', () => {
    expect(
      mapPersonalLeave({
        id: 42,
        leaveType: 'Medical',
        duration: 0.5,
        status: 'Cancelled',
        cancelledBy: 10,
        cancelledAt: null,
      }),
    ).toMatchObject({
      id: 42,
      leaveType: 'Medical',
      duration: 0.5,
      cancelledBy: 10,
      cancelledAt: null,
    })
  })
})
