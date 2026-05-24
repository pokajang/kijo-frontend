import { describe, expect, it } from 'vitest'
import { buildLeaveRecordStats } from './LeaveRecord'

describe('LeaveRecord', () => {
  it('builds staff leave stats from entitlements and records', () => {
    const stats = buildLeaveRecordStats(
      [
        {
          status: 'Pending',
          duration: 1.5,
          appliedAt: '2026-05-20 09:00:00',
        },
        {
          status: 'Cancelled',
          duration: 1,
          appliedAt: '2026-05-19 09:00:00',
        },
        {
          status: 'Approved',
          duration: 2,
          appliedAt: '2026-05-18 09:00:00',
        },
      ],
      [
        {
          year: 2026,
          total_days: 14,
          used_days: 2,
          remaining: 12,
        },
      ],
      2026,
    )

    expect(stats.find((item) => item.key === 'balance')?.label).toBe('Days Balance')
    expect(stats.find((item) => item.key === 'balance')?.value).toBe('12')
    expect(stats.find((item) => item.key === 'used')?.label).toBe('Days Used')
    expect(stats.find((item) => item.key === 'used')?.value).toBe('2')
    expect(stats.find((item) => item.key === 'pending')?.label).toBe('Days Pending Approval')
    expect(stats.find((item) => item.key === 'pending')?.value).toBe('1.5')
    expect(stats.find((item) => item.key === 'pending')?.sublabel).toBe('1 pending request')
    expect(stats.find((item) => item.key === 'cancelled')?.label).toBe('Days Cancelled')
    expect(stats.find((item) => item.key === 'cancelled')?.value).toBe('1')
  })

  it('normalizes record statuses when building leave stats', () => {
    const stats = buildLeaveRecordStats(
      [
        {
          status: ' pending ',
          duration: 2,
          appliedAt: '2026-05-20 09:00:00',
        },
        {
          status: 'cancelled',
          duration: 1,
          appliedAt: '2026-05-19 09:00:00',
        },
      ],
      [],
      2026,
    )

    expect(stats.find((item) => item.key === 'pending')?.value).toBe('2')
    expect(stats.find((item) => item.key === 'pending')?.sublabel).toBe('1 pending request')
    expect(stats.find((item) => item.key === 'cancelled')?.value).toBe('1')
  })
})
