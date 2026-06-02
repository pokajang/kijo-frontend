import { describe, expect, it } from 'vitest'
import { buildLeaveBalanceSummary, getDefaultLeaveType } from './leaveBalanceSummary'

describe('LeaveRecord', () => {
  it('builds type-scoped this-year, last-year, and all-time balance summaries', () => {
    const summary = buildLeaveBalanceSummary(
      [
        {
          year: 2026,
          leave_type: 'Annual',
          total_days: 14,
          used_days: 2,
          remaining: 12,
        },
        {
          year: 2026,
          leave_type: 'Annual',
          total_days: 1.5,
          used_days: 0.5,
        },
        {
          year: 2025,
          leave_type: 'Annual',
          total_days: 12,
          used_days: 9,
          remaining: 3,
        },
        {
          year: 2024,
          leave_type: 'Annual',
          total_days: 10,
          used_days: 4,
        },
        {
          year: 2026,
          leave_type: 'Medical',
          total_days: 30,
          used_days: 5,
          remaining: 25,
        },
      ],
      2026,
      'Annual',
    )

    expect(summary).toHaveLength(3)
    expect(summary[0]).toEqual({
      key: 'this-year',
      title: 'This Year',
      badge: '2026',
      metrics: [
        { key: 'assigned', label: 'Assigned', value: '15.5' },
        { key: 'used', label: 'Used', value: '2.5' },
        { key: 'balance', label: 'Balance', value: '13' },
      ],
    })
    expect(summary[1]).toEqual({
      key: 'last-year',
      title: 'Last Year',
      badge: '2025',
      metrics: [
        { key: 'assigned', label: 'Assigned', value: '12' },
        { key: 'used', label: 'Used', value: '9' },
        { key: 'balance', label: 'Balance', value: '3' },
      ],
    })
    expect(summary[2]).toEqual({
      key: 'all-time',
      title: 'All Time',
      badge: 'Total',
      metrics: [
        { key: 'assigned', label: 'Assigned', value: '37.5' },
        { key: 'used', label: 'Used', value: '15.5' },
        { key: 'balance', label: 'Balance', value: '22' },
      ],
    })
  })

  it('returns zero values when this-year and last-year entitlements are missing', () => {
    const summary = buildLeaveBalanceSummary(
      [
        {
          year: 2024,
          leave_type: 'Annual',
          total_days: 8,
          used_days: 3,
          remaining: 5,
        },
      ],
      2026,
    )

    expect(summary[0].metrics.map((metric) => metric.value)).toEqual(['0', '0', '0'])
    expect(summary[1].metrics.map((metric) => metric.value)).toEqual(['0', '0', '0'])
    expect(summary[2].metrics.map((metric) => metric.value)).toEqual(['8', '3', '5'])
  })

  it('can intentionally summarize all leave types', () => {
    const summary = buildLeaveBalanceSummary(
      [
        {
          year: 2026,
          leave_type: 'Annual',
          total_days: 14,
          used_days: 2,
          remaining: 12,
        },
        {
          year: 2026,
          leave_type: 'Medical',
          total_days: 30,
          used_days: 5,
          remaining: 25,
        },
      ],
      2026,
    )

    expect(summary[0].metrics.map((metric) => metric.value)).toEqual(['44', '7', '37'])
    expect(summary[2].metrics.map((metric) => metric.value)).toEqual(['44', '7', '37'])
  })

  it('defaults the selector to an annual leave type when available', () => {
    expect(
      getDefaultLeaveType([
        { leave_type: 'Medical' },
        { leave_type: 'Annual Leave' },
        { leave_type: 'Emergency' },
      ]),
    ).toBe('Annual Leave')
  })
})
