import { describe, expect, it } from 'vitest'
import { toLocalDateInputValue, toLocalMonthInputValue } from './dateInputValues'

describe('local date input values', () => {
  it('uses local calendar fields instead of UTC serialization', () => {
    const localDate = new Date(2026, 8, 1, 0, 30)

    expect(toLocalDateInputValue(localDate)).toBe('2026-09-01')
    expect(toLocalMonthInputValue(localDate)).toBe('2026-09')
  })

  it('returns an empty value for invalid dates', () => {
    expect(toLocalDateInputValue('not-a-date')).toBe('')
  })
})
