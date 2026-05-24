import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  default as SectionAllLeaves,
  getLeaveApplicationScopeDate,
  getLeaveStatusSortPriority,
  getLeaveWorkflowText,
} from './SectionAllLeaves'
import AppNotificationProvider from '../../../notifications/AppNotificationProvider'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SectionAllLeaves', () => {
  it('filters leave applications by applied date before leave start date', () => {
    expect(
      getLeaveApplicationScopeDate({
        applied_at: '2026-05-20 09:15:00',
        start_date: '2026-08-01',
      }),
    ).toBe('2026-05-20 09:15:00')
  })

  it('falls back to start date for legacy records without applied date', () => {
    expect(getLeaveApplicationScopeDate({ start_date: '2026-08-01' })).toBe('2026-08-01')
  })

  it('prioritizes pending leave records before completed statuses', () => {
    expect(getLeaveStatusSortPriority('Pending')).toBeLessThan(
      getLeaveStatusSortPriority('Approved'),
    )
    expect(getLeaveStatusSortPriority('Approved')).toBeLessThan(
      getLeaveStatusSortPriority('Rejected'),
    )
  })

  it('shows pending workflow path before review', () => {
    expect(getLeaveWorkflowText({ status: 'Pending' })).toBe(
      'Next: Recommend or Reject > Approve or Reject',
    )
  })

  it('surfaces review and approval remarks in workflow text', () => {
    const workflow = getLeaveWorkflowText(
      {
        status: 'Approved',
        reviewed_by: 20,
        reviewed_status: 'Recommended',
        reviewed_remarks: 'Coverage checked',
        approved_by: 30,
        approved_status: 'Approved',
        approved_remarks: 'Approved by management',
      },
      'HR User (HR1)',
      'Manager User (MGR1)',
    )

    expect(workflow).toContain('Review: Recommended by HR User (HR1)')
    expect(workflow).toContain('Remarks: Coverage checked')
    expect(workflow).toContain('Approval: Approved by Manager User (MGR1)')
    expect(workflow).toContain('Remarks: Approved by management')
  })

  it('shows cancellation in workflow text when leave is cancelled before review', () => {
    const workflow = getLeaveWorkflowText(
      {
        status: 'Cancelled',
        cancelled_by: 10,
        cancelled_at: '2026-05-20 10:30:00',
      },
      '',
      '',
      'Employee One (EMP1)',
    )

    expect(workflow).toBe('Cancellation: Cancelled by Employee One (EMP1) at 2026-05-20 10:30:00')
  })

  it('shows email workflow in the module actions menu', () => {
    const onManageWorkflow = vi.fn()
    render(
      <SectionAllLeaves
        allLeaveRecords={[]}
        fetchAllLeaveRecords={vi.fn()}
        onManageEntitlements={vi.fn()}
        onAssignLeave={vi.fn()}
        onManageWorkflow={onManageWorkflow}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^actions$/i }))
    fireEvent.click(screen.getByText('Email Workflow'))

    expect(onManageWorkflow).toHaveBeenCalledTimes(1)
  })

  it('uses the notification summary count for the pending actions stat', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        data: {
          total: 3,
          by_module: { 'staff.leaves': 3 },
          by_route_group: { '/staff/leaves': 3 },
          by_tab: { 'staff.leaves': 3 },
        },
      }),
    })

    render(
      <AppNotificationProvider>
        <SectionAllLeaves
          allLeaveRecords={[
            {
              id: 1,
              status: 'Pending',
              type: 'Annual',
              duration_days: 1,
              applied_at: '2026-05-20 09:15:00',
              start_date: '2026-06-01',
              start_time: '08:30',
              end_date: '2026-06-01',
              end_time: '17:30',
            },
            {
              id: 2,
              status: 'Pending',
              type: 'Medical',
              duration_days: 1,
              applied_at: '2026-05-21 09:15:00',
              start_date: '2026-06-02',
              start_time: '08:30',
              end_date: '2026-06-02',
              end_time: '17:30',
            },
          ]}
          fetchAllLeaveRecords={vi.fn()}
        />
      </AppNotificationProvider>,
    )

    await waitFor(() => {
      const card = screen.getByText('Pending Actions').closest('.stats-strip-widget')
      expect(within(card).getByText('3')).toBeInTheDocument()
      expect(within(card).getByText('2 pending visible')).toBeInTheDocument()
    })
  })

  it('does not render approval controls for users outside the approval stage', () => {
    render(
      <SectionAllLeaves
        allLeaveRecords={[
          {
            id: 1,
            status: 'Pending',
            type: 'Annual',
            duration_days: 1,
            applied_at: '2026-05-20 09:15:00',
            start_date: '2026-06-01',
            start_time: '08:30',
            end_date: '2026-06-01',
            end_time: '17:30',
            reviewed_by: 20,
            reviewed_status: 'Recommended',
          },
        ]}
        fetchAllLeaveRecords={vi.fn()}
        canRecommendActions
        canApproveActions={false}
      />,
    )

    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument()
  })
})
