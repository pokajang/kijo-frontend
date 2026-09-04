import { describe, expect, it } from 'vitest'
import { formatWeekLabel, getWeekEnd, getWeekStart, shiftWeekStart } from './taskWeekUtils'

describe('task week utilities', () => {
  it('normalizes any day to the Monday of its reporting week', () => {
    expect(getWeekStart('2026-08-20')).toBe('2026-08-17')
    expect(getWeekEnd('2026-08-17')).toBe('2026-08-23')
  })

  it('moves between weeks without changing the weekday boundary', () => {
    expect(shiftWeekStart('2026-08-17', -1)).toBe('2026-08-10')
    expect(shiftWeekStart('2026-08-17', 1)).toBe('2026-08-24')
    expect(formatWeekLabel('2026-08-17')).toContain('17')
  })
})
