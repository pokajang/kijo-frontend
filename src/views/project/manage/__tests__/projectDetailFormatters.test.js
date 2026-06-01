import { describe, expect, it } from 'vitest'

import {
  formatProjectDate,
  formatProjectDateTime,
  formatProjectDateTimeParts,
  formatProjectCumulativeDays,
  formatProjectDeltaDays,
  formatProjectDurationDays,
  formatProjectMoney,
  getProjectLatestUpdate,
  getProjectLeader,
} from '../projectDetailFormatters'

describe('projectDetailFormatters', () => {
  it('formats money consistently with RM and two decimals', () => {
    expect(formatProjectMoney(4872)).toBe('RM 4,872.00')
    expect(formatProjectMoney('4500.5')).toBe('RM 4,500.50')
    expect(formatProjectMoney('RM 4,872.00')).toBe('RM 4,872.00')
    expect(formatProjectMoney(0)).toBe('RM 0.00')
    expect(formatProjectMoney('')).toBe('-')
    expect(formatProjectMoney('not-a-number')).toBe('-')
  })

  it('formats date and date-time display values', () => {
    expect(formatProjectDate('2026-03-13 23:28:22')).toBe('2026-03-13')
    expect(formatProjectDate('2026-03-13T23:28:22Z')).toBe('2026-03-13')
    expect(formatProjectDate('')).toBe('-')
    expect(formatProjectDateTime('2026-03-13T23:28:22Z')).toBe('2026-03-13 23:28:22')
    expect(formatProjectDateTime(null)).toBe('-')
  })

  it('splits date-time values into display parts', () => {
    expect(formatProjectDateTimeParts('2026-05-29 09:00:13')).toEqual({
      date: '2026-05-29',
      time: '09:00:13',
    })
    expect(formatProjectDateTimeParts('')).toEqual({ date: '-', time: '-' })
    expect(formatProjectDateTimeParts('bad-date')).toEqual({ date: '-', time: '-' })
  })

  it('formats progress day deltas and cumulative values', () => {
    expect(formatProjectDeltaDays(3)).toBe('+3d')
    expect(formatProjectDeltaDays(0)).toBe('0d')
    expect(formatProjectDeltaDays(null)).toBe('-')
    expect(formatProjectCumulativeDays(88)).toBe('Cum. 88d')
    expect(formatProjectCumulativeDays(null)).toBe('Cum. -')
  })

  it('formats date-only award duration without time-of-day drift', () => {
    expect(formatProjectDurationDays('2026-03-13 23:28:22', '2026-03-13')).toBe('0 days')
    expect(formatProjectDurationDays('2026-03-13', '2026-03-14')).toBe('1 day')
    expect(formatProjectDurationDays('bad-date', '2026-03-14')).toBe('-')
  })

  it('extracts project leader and latest update display values', () => {
    const project = {
      assigned_staff: [
        { project_role: 'Assistant', full_name: 'Other Staff', name_code: 'OTH' },
        { project_role: 'Leader', full_name: 'Azam Bin Husain', name_code: 'AZA' },
      ],
      progress_updates: [
        { progress_date: '2026-03-01', progress_text: 'Start' },
        { progress_date: '2026-03-15', progress_text: 'Latest' },
      ],
    }

    expect(getProjectLeader(project)).toBe('Azam Bin Husain (AZA)')
    expect(getProjectLatestUpdate(project)).toBe('2026-03-15')
    expect(getProjectLeader({ assigned_staff: [] })).toBe('-')
    expect(getProjectLatestUpdate({ progress_updates: [] })).toBe('-')
  })
})
