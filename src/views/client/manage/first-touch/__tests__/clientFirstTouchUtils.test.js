import { describe, expect, it } from 'vitest'
import { FIRST_TOUCH_RECORDS } from '../clientFirstTouchMockData'
import {
  filterFirstTouchRecords,
  formatCompactContributionMoney,
  getFirstTouchSourceLabel,
  getFirstTouchStatus,
  groupFirstTouchRecordsBySource,
} from '../clientFirstTouchUtils'

describe('clientFirstTouchUtils', () => {
  it('treats clients without an origin as not documented', () => {
    expect(getFirstTouchStatus(FIRST_TOUCH_RECORDS.find((record) => !record.firstTouch))).toBe(
      'missing',
    )
  })

  it('formats the source without implying sales attribution', () => {
    expect(getFirstTouchSourceLabel(FIRST_TOUCH_RECORDS[0].firstTouch)).toBe(
      'LinkedIn · Organic post',
    )
  })

  it('filters by client, status, and source group', () => {
    expect(
      filterFirstTouchRecords(FIRST_TOUCH_RECORDS, {
        search: 'tnb',
        status: 'current',
        sourceGroup: 'Digital',
      }).map((record) => record.companyId),
    ).toEqual([399])
  })

  it('filters evidence coverage to clients that still need documentation', () => {
    expect(
      filterFirstTouchRecords(FIRST_TOUCH_RECORDS, { evidence: 'missing' }).every(
        (record) => !record.firstTouch,
      ),
    ).toBe(true)
  })

  it('groups only current first-touch records under their documented source group', () => {
    const grouped = groupFirstTouchRecordsBySource(FIRST_TOUCH_RECORDS)
    const totalClients = grouped.reduce((sum, row) => sum + row.clientCount, 0)
    const digital = grouped.find((row) => row.sourceGroup === 'Digital')

    expect(totalClients).toBe(
      FIRST_TOUCH_RECORDS.filter((record) => record.firstTouch?.status === 'current').length,
    )
    expect(digital.clientCount).toBe(1)
  })

  it('formats lifetime contribution compactly', () => {
    expect(formatCompactContributionMoney(1280000)).toBe('RM 1.28M')
    expect(formatCompactContributionMoney(312000)).toBe('RM 312K')
  })
})
