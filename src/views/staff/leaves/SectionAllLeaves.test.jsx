import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  default as SectionAllLeaves,
  getLeaveApplicationScopeDate,
  getLeaveStatusSortPriority,
  getLeaveWorkflowText,
} from './SectionAllLeaves'
import AppNotificationProvider from '../../../notifications/AppNotificationProvider'
import { getPeriodRangePreset } from '../../../components/filters'

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    'aria-label': ariaLabel,
  }) => (
    <select
      aria-label={ariaLabel || placeholder}
      value={value?.value ?? ''}
      onChange={(event) => {
        const selected = options.find((option) => String(option.value) === event.target.value)
        onChange?.(selected || null)
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

const currentYear = new Date().getFullYear()

const hrStaffList = [
  { staff_id: 7, full_name: 'Azam Bin Husain', name_code: 'AZM', status: 'Active' },
  { staff_id: 8, full_name: 'Bina Noor', name_code: 'BIN', status: 'Active' },
  {
    staff_id: 9,
    full_name: 'Ceri Terminated',
    name_code: 'CER',
    status: 'Terminated',
    terminated_at: '2025-12-31 00:00:00',
  },
]

const hrLeaveRecords = [
  {
    id: 70,
    staff_id: 7,
    applicant_name: 'Azam Bin Husain',
    applicant_code: 'AZM',
    status: 'Approved',
    type: 'Annual',
    duration_days: 3,
    reason: 'Azam annual 2025',
    applied_at: '2025-05-20 09:15:00',
    start_date: '2025-06-01',
    start_time: '08:30',
    end_date: '2025-06-03',
    end_time: '17:30',
  },
  {
    id: 71,
    staff_id: 7,
    applicant_name: 'Azam Bin Husain',
    applicant_code: 'AZM',
    status: 'Approved',
    type: 'Medical',
    duration_days: 2,
    reason: 'Azam medical 2026',
    applied_at: '2026-03-20 09:15:00',
    start_date: '2026-03-21',
    start_time: '08:30',
    end_date: '2026-03-22',
    end_time: '17:30',
  },
  {
    id: 72,
    staff_id: 7,
    applicant_name: 'Azam Bin Husain',
    applicant_code: 'AZM',
    status: 'Approved',
    type: 'Annual',
    duration_days: 1,
    reason: 'Azam applied 2025 start 2026',
    applied_at: '2025-12-20 09:15:00',
    start_date: '2026-01-03',
    start_time: '08:30',
    end_date: '2026-01-03',
    end_time: '17:30',
  },
  {
    id: 80,
    staff_id: 8,
    applicant_name: 'Bina Noor',
    applicant_code: 'BIN',
    status: 'Approved',
    type: 'Annual',
    duration_days: 5,
    reason: 'Bina annual 2025',
    applied_at: '2025-07-20 09:15:00',
    start_date: '2025-07-21',
    start_time: '08:30',
    end_date: '2025-07-25',
    end_time: '17:30',
  },
  {
    id: 90,
    staff_id: 9,
    applicant_name: 'Ceri Terminated',
    applicant_code: 'CER',
    applicant_status: 'Terminated',
    applicant_terminated_at: '2025-12-31 00:00:00',
    status: 'Approved',
    type: 'Frozen Leave',
    duration_days: 6,
    reason: 'Ceri inactive annual 2025',
    applied_at: '2025-08-20 09:15:00',
    start_date: '2025-08-21',
    start_time: '08:30',
    end_date: '2025-08-26',
    end_time: '17:30',
  },
]

const hrEntitlements = [
  {
    id: 700,
    staff_id: 7,
    full_name: 'Azam Bin Husain',
    name_code: 'AZM',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 14,
    used_days: 3,
    remaining: 11,
  },
  {
    id: 701,
    staff_id: 7,
    full_name: 'Azam Bin Husain',
    name_code: 'AZM',
    leave_type: 'Annual',
    year: currentYear - 1,
    total_days: 12,
    used_days: 4,
    remaining: 8,
  },
  {
    id: 702,
    staff_id: 7,
    full_name: 'Azam Bin Husain',
    name_code: 'AZM',
    leave_type: 'Medical',
    year: currentYear,
    total_days: 10,
    used_days: 2,
    remaining: 8,
  },
  {
    id: 800,
    staff_id: 8,
    full_name: 'Bina Noor',
    name_code: 'BIN',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 18,
    used_days: 5,
    remaining: 13,
  },
  {
    id: 900,
    staff_id: 9,
    full_name: 'Ceri Terminated',
    name_code: 'CER',
    staff_status: 'Terminated',
    staff_terminated_at: '2025-12-31 00:00:00',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 20,
    used_days: 6,
    remaining: 14,
  },
]

const renderHrSection = (props = {}) =>
  render(
    <SectionAllLeaves
      allLeaveRecords={hrLeaveRecords}
      fetchAllLeaveRecords={vi.fn()}
      staffList={hrStaffList}
      entitlements={hrEntitlements}
      canManageLeaveAdmin
      periodRange={getPeriodRangePreset('all')}
      {...props}
    />,
  )

afterEach(() => {
  cleanup()
  window.localStorage.removeItem('datatable.stats-visible.staff.leaves.v1')
  vi.restoreAllMocks()
})

describe('SectionAllLeaves', () => {
  it('filters leave applications by leave start date', () => {
    expect(
      getLeaveApplicationScopeDate({
        applied_at: '2026-05-20 09:15:00',
        start_date: '2026-08-01',
      }),
    ).toBe('2026-08-01')
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

  it('shows workflows in the module actions menu', () => {
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
    fireEvent.click(screen.getByText('Workflows'))

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
      expect(within(card).getByText('awaiting you · 2 in current period')).toBeInTheDocument()
    })
  })

  it('keeps HR staff and leave type selectors inside advanced filters', () => {
    const { container } = renderHrSection()

    expect(container.querySelector('.leave-record-balance-card')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending Actions')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Toggle advanced filters'))

    expect(screen.getByLabelText('Select staff')).toBeInTheDocument()
    const leaveTypeSelect = screen.getByLabelText('Filter leave type')
    expect(leaveTypeSelect).not.toBeDisabled()
    expect(leaveTypeSelect).toHaveValue('')
    expect(
      within(screen.getByLabelText('Select staff')).queryByRole('option', {
        name: 'Ceri Terminated (CER)',
      }),
    ).not.toBeInTheDocument()
  })

  it('hides inactive HR leave records by default and shows them when requested', () => {
    renderHrSection()

    expect(screen.queryByText('Ceri inactive annual 2025')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Toggle advanced filters'))
    expect(
      within(screen.getByLabelText('Filter leave type')).queryByRole('option', {
        name: 'Frozen Leave',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Select staff')).queryByRole('option', {
        name: 'Ceri Terminated (CER)',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Include inactive/terminated staff'))

    expect(screen.getByText('Ceri inactive annual 2025')).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Select staff')).getByRole('option', {
        name: 'Ceri Terminated (CER)',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Filter leave type')).getByRole('option', {
        name: 'Frozen Leave',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Staff: Including inactive')).toBeInTheDocument()
  })

  it('resets the inactive staff HR records filter', () => {
    renderHrSection()

    fireEvent.click(screen.getByLabelText('Toggle advanced filters'))
    fireEvent.click(screen.getByLabelText('Include inactive/terminated staff'))
    expect(screen.getByText('Ceri inactive annual 2025')).toBeInTheDocument()

    fireEvent.click(screen.getAllByLabelText('Reset filters')[0])

    expect(screen.getByLabelText('Include inactive/terminated staff')).not.toBeChecked()
    expect(screen.queryByText('Ceri inactive annual 2025')).not.toBeInTheDocument()
  })

  it('filters HR leave records by exact selected staff id', () => {
    renderHrSection()

    fireEvent.change(screen.getByLabelText('Select staff'), { target: { value: '7' } })

    expect(screen.getByText('Azam annual 2025')).toBeInTheDocument()
    expect(screen.getByText('Azam medical 2026')).toBeInTheDocument()
    expect(screen.getByText('Azam applied 2025 start 2026')).toBeInTheDocument()
    expect(screen.queryByText('Bina annual 2025')).not.toBeInTheDocument()
  })

  it('combines selected staff and a 2025 period filter', () => {
    renderHrSection({
      periodRange: {
        preset: 'custom',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      },
    })

    fireEvent.change(screen.getByLabelText('Select staff'), { target: { value: '7' } })

    expect(screen.getByText('Azam annual 2025')).toBeInTheDocument()
    expect(screen.queryByText('Azam medical 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('Azam applied 2025 start 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('Bina annual 2025')).not.toBeInTheDocument()
  })

  it('renders all-time year separators for HR records', () => {
    const { container } = renderHrSection()

    const groupRows = container.querySelectorAll('tr.data-table-group-row')
    expect(groupRows).toHaveLength(2)
    expect(groupRows[0]).toHaveTextContent('2026')
    expect(groupRows[1]).toHaveTextContent('2025')
  })

  it('shows selected staff annual entitlement totals in HR balance cards', () => {
    renderHrSection()

    fireEvent.change(screen.getByLabelText('Select staff'), { target: { value: '7' } })

    const thisYearCard = screen.getByText('This Year').closest('.leave-record-balance-card')
    const lastYearCard = screen.getByText('Last Year').closest('.leave-record-balance-card')
    const allTimeCard = screen
      .getAllByText('All Time')
      .find((node) => node.classList.contains('leave-balance-card-title'))
      .closest('.leave-record-balance-card')

    expect(
      Array.from(thisYearCard.querySelectorAll('.leave-record-balance-metric-value')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['14', '3', '11'])
    expect(
      Array.from(lastYearCard.querySelectorAll('.leave-record-balance-metric-value')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['12', '4', '8'])
    expect(
      Array.from(allTimeCard.querySelectorAll('.leave-record-balance-metric-value')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['26', '7', '19'])
  })

  it('changes HR balance cards when the leave type selector changes', () => {
    renderHrSection()

    fireEvent.change(screen.getByLabelText('Select staff'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Filter leave type'), { target: { value: 'Medical' } })

    const thisYearCard = screen.getByText('This Year').closest('.leave-record-balance-card')
    const lastYearCard = screen.getByText('Last Year').closest('.leave-record-balance-card')

    expect(
      Array.from(thisYearCard.querySelectorAll('.leave-record-balance-metric-value')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['10', '2', '8'])
    expect(
      Array.from(lastYearCard.querySelectorAll('.leave-record-balance-metric-value')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['0', '0', '0'])
  })

  it('keeps the HR staff selector filtering rows when balance cards are hidden', () => {
    window.localStorage.setItem('datatable.stats-visible.staff.leaves.v1', 'false')
    const { container } = renderHrSection()

    expect(container.querySelector('.leave-record-balance-card')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select staff'), { target: { value: '7' } })

    expect(screen.getByText('Azam annual 2025')).toBeInTheDocument()
    expect(screen.getByText('Azam medical 2026')).toBeInTheDocument()
    expect(screen.queryByText('Bina annual 2025')).not.toBeInTheDocument()
  })

  it('keeps operational stats for non-HR records users without entitlement props', () => {
    render(
      <AppNotificationProvider>
        <SectionAllLeaves
          allLeaveRecords={hrLeaveRecords}
          fetchAllLeaveRecords={vi.fn()}
          canManageLeaveAdmin={false}
        />
      </AppNotificationProvider>,
    )

    expect(screen.getByText('Pending Actions')).toBeInTheDocument()
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

  it('uses info for first-stage workflow actions and success for final approval', () => {
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
            reviewed_by: 20,
            reviewed_status: 'Recommended',
          },
        ]}
        fetchAllLeaveRecords={vi.fn()}
        canRecommendActions
        canApproveActions
      />,
    )

    expect(screen.getByRole('button', { name: /^recommend$/i })).toHaveClass('btn-outline-info')
    expect(screen.getByRole('button', { name: /^approve$/i })).toHaveClass('btn-outline-success')
  })
})
