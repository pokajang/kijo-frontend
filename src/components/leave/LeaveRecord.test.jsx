import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaveRecord from './LeaveRecord'
import { buildLeaveBalanceSummary, getDefaultLeaveType } from './leaveBalanceSummary'
import * as AH from './actionHandlers'

vi.mock('./actionHandlers', () => ({
  getMyEntitlements: vi.fn(),
  getMyEntitlementHistory: vi.fn(),
}))

vi.mock('./actionHandlersRecords', () => ({
  useLeaveRecordHandlers: () => ({
    leaveRecords: [],
    loadingRecords: false,
    recordsError: '',
    fetchLeaveRecords: vi.fn(async () => true),
    handleCancel: vi.fn(),
    getStatusBadge: vi.fn(),
  }),
}))

vi.mock('./LeaveRecordTable', () => ({
  default: () => <div>Leave Records Table</div>,
}))

vi.mock('../../notifications/AppNotificationProvider', () => ({
  useAppNotifications: () => ({
    consumeRouteGroup: vi.fn(async () => {}),
  }),
}))

describe('LeaveRecord', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads employee assignment history only after the assignment history button is opened', async () => {
    const currentYear = new Date().getFullYear()
    AH.getMyEntitlements.mockResolvedValueOnce([
      {
        id: 1,
        leave_type: 'Annual',
        year: currentYear,
        total_days: 12.2,
        used_days: 0,
        remaining: 12.2,
      },
    ])
    AH.getMyEntitlementHistory.mockResolvedValueOnce([
      {
        id: 4,
        event_type: 'Assigned',
        leave_type: 'Annual',
        year: currentYear,
        days: '12.2',
        assigned_by: 'HR User (HR1)',
        description: `Assigned leave entitlement #4 to staff #10, Annual, ${currentYear}, 12.2 days`,
        created_at: `${currentYear}-01-01 09:00:00`,
      },
    ])

    render(
      <MemoryRouter>
        <LeaveRecord />
      </MemoryRouter>,
    )

    await screen.findByText('Annual')
    expect(AH.getMyEntitlementHistory).not.toHaveBeenCalled()
    expect(screen.queryByText(/Assigned leave entitlement #4/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Assignment History' }))

    await waitFor(() => {
      expect(AH.getMyEntitlementHistory).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText('Annual - 2026')).toBeInTheDocument()
    expect(screen.getAllByText(/12\.2 days/).length).toBeGreaterThan(0)
    expect(screen.getByText(/By HR User \(HR1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Assigned leave entitlement #4/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide Assignment History' })).toBeInTheDocument()
  })

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

  it('includes remarks only for single type-scoped yearly entitlement cards', () => {
    const summary = buildLeaveBalanceSummary(
      [
        {
          year: 2026,
          leave_type: 'Annual',
          total_days: 14,
          used_days: 2,
          remarks: 'Prorated from start date',
        },
        {
          year: 2025,
          leave_type: 'Annual',
          total_days: 12,
          used_days: 4,
          remarks: 'Previous year balance',
        },
      ],
      2026,
      'Annual',
    )

    expect(summary[0].remarks).toBe('Prorated from start date')
    expect(summary[1].remarks).toBe('Previous year balance')
    expect(summary[2].remarks).toBeUndefined()

    const allTypesSummary = buildLeaveBalanceSummary(
      [
        {
          year: 2026,
          leave_type: 'Annual',
          total_days: 14,
          used_days: 2,
          remarks: 'Prorated from start date',
        },
      ],
      2026,
    )

    expect(allTypesSummary[0].remarks).toBeUndefined()
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
