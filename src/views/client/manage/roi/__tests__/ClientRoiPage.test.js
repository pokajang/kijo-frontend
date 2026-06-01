import { describe, expect, it } from 'vitest'
import { buildClientRoiDetailSearch } from '../clientRoiRouteUtils'

describe('buildClientRoiDetailSearch', () => {
  it('passes the active period to the client ROI drilldown route', () => {
    expect(
      buildClientRoiDetailSearch({
        preset: 'custom',
        startDate: '2026-01-01',
        endDate: '2026-05-19',
      }),
    ).toBe('?start=2026-01-01&end=2026-05-19')
  })

  it('passes all-time to the client ROI drilldown route', () => {
    expect(buildClientRoiDetailSearch({ preset: 'all', startDate: '', endDate: '' })).toBe(
      '?period=all',
    )
  })
})
