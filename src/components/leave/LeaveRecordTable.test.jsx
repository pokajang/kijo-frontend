import { describe, expect, it } from 'vitest'
import {
  getLeaveRecordScopeDate,
  getPersonalLeaveStatusSortPriority,
  getPersonalLeaveWorkflowSteps,
} from './LeaveRecordTable'

describe('LeaveRecordTable', () => {
  it('filters personal leave records by applied date before leave start date', () => {
    expect(
      getLeaveRecordScopeDate({
        appliedAt: '2026-05-20 09:15:00',
        startDate: '2026-08-01',
      }),
    ).toBe('2026-05-20 09:15:00')
  })

  it('falls back to start date for legacy records without applied date', () => {
    expect(getLeaveRecordScopeDate({ startDate: '2026-08-01' })).toBe('2026-08-01')
  })

  it('prioritizes pending personal leave records before completed statuses', () => {
    expect(getPersonalLeaveStatusSortPriority('Pending')).toBeLessThan(
      getPersonalLeaveStatusSortPriority('Approved'),
    )
    expect(getPersonalLeaveStatusSortPriority('Approved')).toBeLessThan(
      getPersonalLeaveStatusSortPriority('Rejected'),
    )
    expect(getPersonalLeaveStatusSortPriority('Rejected')).toBeLessThan(
      getPersonalLeaveStatusSortPriority('Cancelled'),
    )
  })

  it('builds stacked workflow steps for review and approval', () => {
    const steps = getPersonalLeaveWorkflowSteps({
      status: 'Approved',
      reviewedStatus: 'Recommended',
      reviewedAt: '2026-05-20 09:30:00',
      reviewedRemarks: 'Coverage checked',
      approvedStatus: 'Approved',
      approvedAt: '2026-05-20 10:00:00',
      approvedRemarks: 'Approved by management',
    })

    expect(steps).toHaveLength(2)
    expect(steps[0]).toContain('Review: Recommended')
    expect(steps[0]).toContain('Remarks: Coverage checked')
    expect(steps[1]).toContain('Approval: Approved')
    expect(steps[1]).toContain('Remarks: Approved by management')
  })

  it('shows cancellation workflow when leave was cancelled', () => {
    expect(
      getPersonalLeaveWorkflowSteps({
        status: 'Cancelled',
        cancelledAt: '2026-05-20 10:30:00',
      }),
    ).toEqual(['Cancellation: Cancelled at 2026-05-20 10:30:00'])
  })
})
