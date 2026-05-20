import { describe, expect, it } from 'vitest'
import { getLeaveApplicationScopeDate } from './SectionAllLeaves'

describe('SectionAllLeaves', () => {
  it('filters leave applications by applied date before leave start date', () => {
    expect(
      getLeaveApplicationScopeDate({
        applied_at: '2026-05-20 09:15:00',
        start_date: '2026-08-01',
      }),
    ).toBe('2026-05-20 09:15:00')
  })

  it('falls back to start date for legacy records without applied date', () => {
    expect(getLeaveApplicationScopeDate({ start_date: '2026-08-01' })).toBe('2026-08-01')
  })
})
