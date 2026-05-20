import { describe, expect, it } from 'vitest'
import { getLeaveRecordScopeDate } from './LeaveRecordTable'

describe('LeaveRecordTable', () => {
  it('filters personal leave records by applied date before leave start date', () => {
    expect(
      getLeaveRecordScopeDate({
        appliedAt: '2026-05-20 09:15:00',
        startDate: '2026-08-01',
      }),
    ).toBe('2026-05-20 09:15:00')
  })

  it('falls back to start date for legacy records without applied date', () => {
    expect(getLeaveRecordScopeDate({ startDate: '2026-08-01' })).toBe('2026-08-01')
  })
})
