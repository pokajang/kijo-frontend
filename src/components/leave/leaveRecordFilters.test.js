import { describe, expect, it } from 'vitest'
import {
  compareLeaveRecordYearGroupsDesc,
  filterLeaveRecords,
  getLeaveRecordScopeDate,
  getLeaveRecordStatusOptions,
  getLeaveRecordTypeOptions,
  getLeaveRecordYearGroupKey,
  getLeaveStatusSortPriority,
  normalizeLeaveRecordForFilters,
} from './leaveRecordFilters'

describe('leaveRecordFilters', () => {
  it('normalizes personal and HR leave record shapes', () => {
    expect(
      normalizeLeaveRecordForFilters({
        leaveType: 'Annual',
        appliedAt: '2026-05-20',
        startDate: '2026-08-01',
      }),
    ).toMatchObject({
      leaveType: 'Annual',
      appliedAt: '2026-05-20',
      startDate: '2026-08-01',
    })

    expect(
      normalizeLeaveRecordForFilters({
        staff_id: 7,
        type: 'Medical',
        applied_at: '2026-05-20',
        start_date: '2026-08-01',
      }),
    ).toMatchObject({
      staffId: 7,
      leaveType: 'Medical',
      appliedAt: '2026-05-20',
      startDate: '2026-08-01',
    })
  })

  it('uses applied date as the scope date', () => {
    expect(
      getLeaveRecordScopeDate({
        appliedAt: '2026-05-20 09:15:00',
        startDate: '2026-08-01',
      }),
    ).toBe('2026-05-20 09:15:00')
  })

  it('falls back to leave start date when applied date is missing', () => {
    expect(
      getLeaveRecordScopeDate({
        startDate: '2026-08-01',
      }),
    ).toBe('2026-08-01')
  })

  it('filters by leave start date, type, status, and exact staff id', () => {
    const records = [
      {
        id: 1,
        staff_id: 7,
        type: 'Annual',
        status: 'Approved',
        applied_at: '2026-01-20',
        start_date: '2026-01-02',
      },
      {
        id: 2,
        staff_id: 70,
        type: 'Annual',
        status: 'Approved',
        applied_at: '2026-01-03',
        start_date: '2026-01-04',
      },
      {
        id: 3,
        staff_id: 7,
        type: 'Medical',
        status: 'Pending',
        applied_at: '2026-01-05',
        start_date: '2026-01-06',
      },
    ]

    const filtered = filterLeaveRecords(records, {
      leaveType: 'Annual',
      status: 'Approved',
      staffId: 7,
      periodRange: {
        preset: 'custom',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    })

    expect(filtered.map((record) => record.id)).toEqual([1])
  })

  it('builds sorted type and status options', () => {
    const records = [
      { leaveType: 'Medical', status: 'Rejected' },
      { leaveType: 'Frozen Leave', status: 'Approved' },
      { leaveType: 'Annual', status: 'Pending' },
      { leaveType: 'Annual', status: 'Approved' },
    ]

    expect(getLeaveRecordTypeOptions(records)).toEqual(['Annual', 'Frozen Leave', 'Medical'])
    expect(getLeaveRecordStatusOptions(records)).toEqual(['Pending', 'Approved', 'Rejected'])
  })

  it('extracts descending year group keys', () => {
    expect(getLeaveRecordYearGroupKey({ startDate: '2026-08-01' })).toBe('2026')
    expect(getLeaveRecordYearGroupKey({})).toBe('Unknown')
    expect(compareLeaveRecordYearGroupsDesc('2026', '2025')).toBeLessThan(0)
    expect(compareLeaveRecordYearGroupsDesc('Unknown', '2025')).toBeGreaterThan(0)
  })

  it('prioritizes pending leave records before completed statuses', () => {
    expect(getLeaveStatusSortPriority('Pending')).toBeLessThan(
      getLeaveStatusSortPriority('Approved'),
    )
    expect(getLeaveStatusSortPriority('Approved')).toBeLessThan(
      getLeaveStatusSortPriority('Rejected'),
    )
    expect(getLeaveStatusSortPriority('Rejected')).toBeLessThan(
      getLeaveStatusSortPriority('Cancelled'),
    )
  })
})
