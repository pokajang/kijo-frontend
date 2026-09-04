import { describe, expect, it } from 'vitest'
import { applyWeeklyReviewState, getWeeklyReviewState } from './weeklySummaryState'

describe('weekly summary review state', () => {
  it('normalizes review URLs and defaults comparison to the previous week', () => {
    expect(getWeeklyReviewState('?view=weekly&staff_id=42&week=2026-08-20&compare=1')).toEqual({
      weekStart: '2026-08-17',
      staffId: '42',
      compareEnabled: true,
      compareWeekStart: '2026-08-10',
    })
  })

  it('does not enable comparison without an individual staff selection', () => {
    const state = getWeeklyReviewState('?week=2026-08-17&compare=1')
    expect(state.compareEnabled).toBe(false)
    expect(
      applyWeeklyReviewState('?view=weekly', {
        ...state,
        compareEnabled: true,
      }),
    ).toBe('view=weekly&week=2026-08-17')
  })

  it('keeps comparison before the selected week when a URL requests a later week', () => {
    expect(
      getWeeklyReviewState('?staff_id=42&week=2026-08-17&compare=1&compare_week=2026-08-24'),
    ).toMatchObject({
      compareEnabled: true,
      compareWeekStart: '2026-08-10',
    })
  })
})
