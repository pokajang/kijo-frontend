import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getPeriodRangePreset } from '../filters'
import {
  getLeaveRecordScopeDate,
  getPersonalLeaveStatusSortPriority,
  getPersonalLeaveWorkflowSteps,
} from './LeaveRecordTable'
import LeaveRecordTable from './LeaveRecordTable'

const renderTable = (props = {}) =>
  render(
    <LeaveRecordTable
      leaveRecords={[
        {
          id: 1,
          status: 'Approved',
          leaveType: 'Annual',
          duration: 3,
          reason: 'Annual 2026 leave',
          appliedAt: '2025-12-20 09:15:00',
          startDate: '2026-01-10',
          startTime: '08:30',
          endDate: '2026-01-12',
          endTime: '17:30',
        },
        {
          id: 2,
          status: 'Pending',
          leaveType: 'Medical',
          duration: 1,
          reason: 'Medical 2025 leave',
          appliedAt: '2026-01-05 09:15:00',
          startDate: '2025-12-30',
          startTime: '08:30',
          endDate: '2025-12-30',
          endTime: '17:30',
        },
      ]}
      handleCancel={vi.fn()}
      getStatusBadge={() => 'info'}
      {...props}
    />,
  )

afterEach(() => {
  cleanup()
})

describe('LeaveRecordTable', () => {
  it('filters personal leave records by applied date', () => {
    expect(
      getLeaveRecordScopeDate({
        appliedAt: '2026-05-20 09:15:00',
        startDate: '2026-08-01',
      }),
    ).toBe('2026-05-20 09:15:00')
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

  it('filters personal records by exact status', () => {
    renderTable({ periodRange: getPeriodRangePreset('all') })

    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced filters' }))
    fireEvent.change(document.getElementById('leave-filter-status'), {
      target: { value: 'Pending' },
    })

    expect(screen.getAllByText('Medical 2025 leave').length).toBeGreaterThan(0)
    expect(screen.queryByText('Annual 2026 leave')).not.toBeInTheDocument()
  })

  it('uses applied date for personal period filtering', () => {
    renderTable({
      periodRange: {
        preset: 'custom',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    })

    expect(screen.getAllByText('Medical 2025 leave').length).toBeGreaterThan(0)
    expect(screen.queryByText('Annual 2026 leave')).not.toBeInTheDocument()
  })

  it('renders all-time year separators for personal records', () => {
    const { container } = renderTable({ periodRange: getPeriodRangePreset('all') })

    const groupRows = container.querySelectorAll('tr.data-table-group-row')
    expect(groupRows).toHaveLength(2)
    expect(groupRows[0]).toHaveTextContent('2026')
    expect(groupRows[1]).toHaveTextContent('2025')
  })

  it('offers cancellation only for pending records and revoke for approved records', async () => {
    const handleCancel = vi.fn()
    renderTable({
      periodRange: getPeriodRangePreset('all'),
      handleCancel,
      leaveRecords: [
        {
          id: 1,
          status: 'Rejected',
          leaveType: 'Annual',
          duration: 1,
          reason: 'Rejected leave',
          appliedAt: '2026-01-05 09:15:00',
          startDate: '2026-01-10',
          startTime: '08:30',
          endDate: '2026-01-10',
          endTime: '17:30',
        },
        {
          id: 2,
          status: 'Cancelled',
          leaveType: 'Medical',
          duration: 1,
          reason: 'Cancelled leave',
          appliedAt: '2026-01-06 09:15:00',
          startDate: '2026-01-12',
          startTime: '08:30',
          endDate: '2026-01-12',
          endTime: '17:30',
        },
        {
          id: 3,
          status: 'Pending',
          leaveType: 'Frozen Leave',
          duration: 1,
          reason: 'Pending leave',
          appliedAt: '2026-01-07 09:15:00',
          startDate: '2026-01-13',
          startTime: '08:30',
          endDate: '2026-01-13',
          endTime: '17:30',
        },
        {
          id: 4,
          status: 'Approved',
          leaveType: 'Annual',
          duration: 1,
          reason: 'Approved leave',
          appliedAt: '2026-01-08 09:15:00',
          startDate: '2026-01-14',
          startTime: '08:30',
          endDate: '2026-01-14',
          endTime: '17:30',
        },
      ],
    })

    const actionItems = Array.from(document.querySelectorAll('.record-action-menu .dropdown-item'))
    expect([...new Set(actionItems.map((item) => item.textContent))].sort()).toEqual([
      'Cancel',
      'Revoke Leave',
    ])

    fireEvent.click(actionItems.find((item) => item.textContent === 'Cancel'))
    expect(handleCancel).toHaveBeenCalledWith(3, 'Pending')

    fireEvent.click(actionItems.find((item) => item.textContent === 'Revoke Leave'))
    expect(handleCancel).toHaveBeenCalledWith(4, 'Approved')
    expect(handleCancel).toHaveBeenCalledTimes(2)
  })
})
