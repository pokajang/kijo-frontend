import { describe, expect, it } from 'vitest'
import {
  getActivityPeriodParams,
  getPeriodDateParams,
  getPeriodYears,
  getYearScopedParamSets,
  mergeUniqueRecordsById,
} from './periodFetchUtils'
import { getPeriodRangePreset } from './PeriodRangeSelector'

describe('periodFetchUtils', () => {
  const today = new Date(2026, 4, 26)

  it('maps bounded YTD ranges to start/end params', () => {
    expect(getPeriodDateParams(getPeriodRangePreset('ytd', today))).toEqual({
      start: '2026-01-01',
      end: '2026-05-26',
    })
  })

  it('maps all time to unbounded date params and unbounded year params', () => {
    const allTime = getPeriodRangePreset('all', today)

    expect(getPeriodDateParams(allTime)).toEqual({})
    expect(getYearScopedParamSets(allTime, today)).toEqual([{}])
  })

  it('maps a same-year range to one year request', () => {
    expect(getPeriodYears(getPeriodRangePreset('last-30-days', today), today)).toEqual([2026])
    expect(getYearScopedParamSets(getPeriodRangePreset('last-30-days', today), today)).toEqual([
      { year: 2026 },
    ])
  })

  it('defaults year-scoped endpoints to the current year when no period is provided', () => {
    expect(getYearScopedParamSets(undefined, today)).toEqual([{ year: 2026 }])
  })

  it('maps cross-year custom ranges to all covered years', () => {
    const range = {
      preset: 'custom',
      startDate: '2024-12-15',
      endDate: '2026-01-10',
    }

    expect(getPeriodYears(range, today)).toEqual([2024, 2025, 2026])
    expect(getYearScopedParamSets(range, today)).toEqual([
      { year: 2024 },
      { year: 2025 },
      { year: 2026 },
    ])
  })

  it('maps staff activity periods to backend period filters', () => {
    expect(getActivityPeriodParams(getPeriodRangePreset('all', today))).toEqual({
      periodFilter: 'all',
    })
    expect(
      getActivityPeriodParams({
        preset: 'custom',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      }),
    ).toEqual({
      periodFilter: 'custom',
      customStartDate: '2026-02-01',
      customEndDate: '2026-02-28',
    })
  })

  it('deduplicates merged paged/yearly records by id', () => {
    expect(
      mergeUniqueRecordsById([
        { id: 1, name: 'First' },
        { id: 1, name: 'Duplicate' },
        { id: 2, name: 'Second' },
      ]),
    ).toEqual([
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
    ])
  })
})
