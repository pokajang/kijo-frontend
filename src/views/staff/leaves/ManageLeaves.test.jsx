import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import ManageLeaves from './ManageLeaves'
import * as AH from './actionHandlers'
import { APP_NOTIFICATIONS_CHANGED_EVENT } from '../../../notifications/appNotificationEvents'

const authState = vi.hoisted(() => ({
  user: { roles: ['Manager'] },
}))

vi.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: authState.user }),
}))

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({
  default: () => <nav aria-label="Staff sections" />,
}))

vi.mock('./SectionAllLeaves', () => ({
  default: ({
    onManageEntitlements,
    onAssignLeave,
    onManageWorkflow,
    canRecommendActions,
    canApproveActions,
    canManageLeaveAdmin,
    staffList,
    entitlements,
  }) => (
    <div>
      <span>All Leave Records</span>
      <span data-testid="can-recommend">{String(canRecommendActions)}</span>
      <span data-testid="can-approve">{String(canApproveActions)}</span>
      <span data-testid="can-manage-leave-admin">{String(canManageLeaveAdmin)}</span>
      <span data-testid="staff-count">{String(staffList?.length || 0)}</span>
      <span data-testid="entitlement-count">{String(entitlements?.length || 0)}</span>
      {onManageEntitlements && <button type="button">Entitlements</button>}
      {onAssignLeave && (
        <button type="button" onClick={() => onAssignLeave()}>
          Assign Leave
        </button>
      )}
      {onManageWorkflow && <button type="button">Workflows</button>}
    </div>
  ),
}))

vi.mock('./SectionViewAssignments', () => ({
  default: ({ entitlements, entitlementHistory, onAssign, onViewAssignment }) => (
    <div>
      <span>Leave Entitlements</span>
      <span data-testid="view-entitlement-count">{String(entitlements?.length || 0)}</span>
      <span data-testid="view-entitlement-history-count">
        {String(entitlementHistory?.length || 0)}
      </span>
      <button type="button" onClick={() => onAssign?.()}>
        Header Assign Leave
      </button>
      <button
        type="button"
        onClick={() =>
          onViewAssignment?.({
            rowKind: 'assigned',
            id: 44,
            staff_id: 7,
            full_name: 'Azam Bin Husain',
            name_code: 'AZA',
            year: 2026,
            leave_type: 'Annual',
          })
        }
      >
        Open Staff Entitlements
      </button>
      <button
        type="button"
        onClick={() =>
          onAssign?.({
            rowKind: 'missing',
            staff_id: 7,
            year: 2026,
            leave_type: 'Frozen Leave',
          })
        }
      >
        Assign Missing Frozen
      </button>
    </div>
  ),
}))

vi.mock('./SectionAssignLeaves', () => ({
  default: ({ editEntitlement, entitlements, entitlementsLoading }) => (
    <div>
      <span>Assign Leave Entitlement</span>
      <span data-testid="edit-entitlement-id">{editEntitlement?.id || 'none'}</span>
      <span data-testid="assign-entitlement-count">{String(entitlements?.length || 0)}</span>
      <span data-testid="assign-entitlements-loading">{String(entitlementsLoading)}</span>
    </div>
  ),
}))

vi.mock('./actionHandlers', () => ({
  getAllLeaves: vi.fn(async () => []),
  getAllLeavesPayload: vi.fn(async () => ({ leaves: [], actionPermissions: null })),
  getStaffList: vi.fn(async () => []),
  getAllEntitlements: vi.fn(async () => []),
  getLeaveEntitlementHistory: vi.fn(async () => []),
}))

const LocationProbe = () => {
  const location = useLocation()

  return (
    <div>
      <div data-testid="location">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state || {})}</div>
    </div>
  )
}

describe('ManageLeaves permissions', () => {
  afterEach(() => {
    cleanup()
    authState.user = { roles: ['Manager'] }
    vi.clearAllMocks()
  })

  it('hides leave admin actions from managers on the records page', () => {
    render(
      <MemoryRouter>
        <ManageLeaves />
      </MemoryRouter>,
    )

    expect(screen.getByText('All Leave Records')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entitlements' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign Leave' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Workflows' })).not.toBeInTheDocument()
  })

  it('does not fetch staff entitlements for managers on the records page', async () => {
    render(
      <MemoryRouter>
        <ManageLeaves />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(AH.getAllLeavesPayload).toHaveBeenCalled()
    })
    expect(AH.getStaffList).not.toHaveBeenCalled()
    expect(AH.getAllEntitlements).not.toHaveBeenCalled()
    expect(AH.getLeaveEntitlementHistory).not.toHaveBeenCalled()
  })

  it('redirects managers away from leave admin sections', async () => {
    render(
      <MemoryRouter initialEntries={['/staff/leaves/entitlements']}>
        <Routes>
          <Route
            path="/staff/leaves/entitlements"
            element={
              <>
                <ManageLeaves routeSection="entitlements" />
                <LocationProbe />
              </>
            }
          />
          <Route path="/staff/leaves" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/staff/leaves')
    })
    expect(AH.getStaffList).not.toHaveBeenCalled()
    expect(AH.getAllEntitlements).not.toHaveBeenCalled()
    expect(AH.getLeaveEntitlementHistory).not.toHaveBeenCalled()
  })

  it('shows leave admin actions to HR users', () => {
    authState.user = { roles: ['HR'] }

    render(
      <MemoryRouter>
        <ManageLeaves />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Entitlements' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign Leave' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Workflows' })).toBeInTheDocument()
  })

  it('opens blank assignment from the records header action', async () => {
    authState.user = { roles: ['HR'] }

    render(
      <MemoryRouter initialEntries={['/staff/leaves']}>
        <Routes>
          <Route
            path="/staff/leaves"
            element={
              <>
                <ManageLeaves />
                <LocationProbe />
              </>
            }
          />
          <Route path="/staff/leaves/assign" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Assign Leave' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/staff/leaves/assign')
      expect(screen.getByTestId('location-state')).toHaveTextContent(
        JSON.stringify({ returnTo: '/staff/leaves' }),
      )
    })
  })

  it('passes missing entitlement context into assignment navigation', async () => {
    authState.user = { roles: ['HR'] }

    render(
      <MemoryRouter initialEntries={['/staff/leaves/entitlements']}>
        <Routes>
          <Route
            path="/staff/leaves/entitlements"
            element={
              <>
                <ManageLeaves routeSection="entitlements" />
                <LocationProbe />
              </>
            }
          />
          <Route path="/staff/leaves/assign" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Assign Missing Frozen' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/staff/leaves/assign')
      expect(screen.getByTestId('location-state')).toHaveTextContent(
        JSON.stringify({
          returnTo: '/staff/leaves/entitlements',
          assignLeavePrefill: {
            staff_id: 7,
            year: 2026,
            leave_type: 'Frozen Leave',
          },
        }),
      )
    })
  })

  it('waits for entitlement data before rendering the edit entitlement form', async () => {
    authState.user = { roles: ['HR'] }
    AH.getAllEntitlements.mockResolvedValueOnce([
      { id: 44, staff_id: 7, year: 2019, leave_type: 'Annual', total_days: 14 },
    ])
    AH.getLeaveEntitlementHistory.mockImplementationOnce(() => new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={['/staff/leaves/entitlements/44/edit']}>
        <Routes>
          <Route
            path="/staff/leaves/entitlements/:entitlementId/edit"
            element={<ManageLeaves routeSection="assign" />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading leave entitlement...')).toBeInTheDocument()
    expect(screen.queryByText('Assign Leave Entitlement')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Assign Leave Entitlement')).toBeInTheDocument()
      expect(screen.getByTestId('edit-entitlement-id')).toHaveTextContent('44')
      expect(screen.getByTestId('assign-entitlement-count')).toHaveTextContent('1')
      expect(screen.getByTestId('assign-entitlements-loading')).toHaveTextContent('false')
    })
  })

  it('shows a not-found state for unknown entitlement edit URLs', async () => {
    authState.user = { roles: ['HR'] }
    AH.getAllEntitlements.mockResolvedValueOnce([])

    render(
      <MemoryRouter initialEntries={['/staff/leaves/entitlements/999/edit']}>
        <Routes>
          <Route
            path="/staff/leaves/entitlements/:entitlementId/edit"
            element={<ManageLeaves routeSection="assign" />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Leave entitlement not found.')).toBeInTheDocument()
    })
    expect(screen.queryByText('Assign Leave Entitlement')).not.toBeInTheDocument()
  })

  it('opens staff entitlement details from entitlement row navigation', async () => {
    authState.user = { roles: ['HR'] }
    AH.getStaffList.mockResolvedValueOnce([
      { staff_id: 7, full_name: 'Azam Bin Husain', name_code: 'AZA' },
    ])
    AH.getAllEntitlements.mockResolvedValueOnce([
      { id: 44, staff_id: 7, year: 2026, leave_type: 'Annual', total_days: 14 },
      { id: 45, staff_id: 8, year: 2026, leave_type: 'Annual', total_days: 12 },
    ])
    AH.getLeaveEntitlementHistory.mockResolvedValueOnce([{ id: 700, event_type: 'Assigned' }])

    render(
      <MemoryRouter initialEntries={['/staff/leaves/entitlements']}>
        <Routes>
          <Route
            path="/staff/leaves/entitlements"
            element={
              <>
                <ManageLeaves routeSection="entitlements" />
                <LocationProbe />
              </>
            }
          />
          <Route path="/staff/leaves/entitlements/staff/:staffId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('view-entitlement-count')).toHaveTextContent('2')
      expect(screen.getByTestId('view-entitlement-history-count')).toHaveTextContent('1')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open Staff Entitlements' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/staff/leaves/entitlements/staff/7')
      expect(screen.getByTestId('location-state')).toHaveTextContent('"staff_id":7')
      expect(screen.getByTestId('location-state')).toHaveTextContent('"leave_type":"Annual"')
      expect(screen.getByTestId('location-state')).not.toHaveTextContent('"staff_id":8')
    })
  })

  it('keeps entitlement records visible when assignment history loading fails', async () => {
    authState.user = { roles: ['HR'] }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    AH.getAllEntitlements.mockResolvedValueOnce([
      { id: 44, staff_id: 7, year: 2026, leave_type: 'Annual', total_days: 14 },
    ])
    AH.getLeaveEntitlementHistory.mockRejectedValueOnce(new Error('History unavailable'))

    render(
      <MemoryRouter initialEntries={['/staff/leaves/entitlements']}>
        <ManageLeaves routeSection="entitlements" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('view-entitlement-count')).toHaveTextContent('1')
      expect(screen.getByTestId('view-entitlement-history-count')).toHaveTextContent('0')
    })

    consoleSpy.mockRestore()
  })

  it('fetches staff list and entitlements for HR users on the records page', async () => {
    authState.user = { roles: ['HR'] }
    AH.getStaffList.mockResolvedValueOnce([{ staff_id: 1, full_name: 'HR Staff' }])
    AH.getAllEntitlements.mockResolvedValueOnce([{ id: 10, staff_id: 1, leave_type: 'Annual' }])
    AH.getLeaveEntitlementHistory.mockResolvedValueOnce([{ id: 20, event_type: 'Assigned' }])

    render(
      <MemoryRouter>
        <ManageLeaves />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(AH.getStaffList).toHaveBeenCalledTimes(1)
      expect(AH.getAllEntitlements).toHaveBeenCalledTimes(1)
      expect(AH.getLeaveEntitlementHistory).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByTestId('can-manage-leave-admin')).toHaveTextContent('true')
      expect(screen.getByTestId('staff-count')).toHaveTextContent('1')
      expect(screen.getByTestId('entitlement-count')).toHaveTextContent('1')
    })
  })

  it('uses backend workflow permissions for leave record actions', async () => {
    authState.user = { roles: ['Employee'] }
    AH.getAllLeavesPayload.mockResolvedValueOnce({
      leaves: [],
      actionPermissions: { canRecommend: false, canApprove: true },
    })

    render(
      <MemoryRouter>
        <ManageLeaves />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('can-recommend')).toHaveTextContent('false')
      expect(screen.getByTestId('can-approve')).toHaveTextContent('true')
    })
  })

  it('refreshes HR-facing leave records when leave notifications change', async () => {
    render(
      <MemoryRouter>
        <ManageLeaves />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(AH.getAllLeavesPayload).toHaveBeenCalledTimes(1)
    })

    fireEvent(window, new Event(APP_NOTIFICATIONS_CHANGED_EVENT))

    await waitFor(() => {
      expect(AH.getAllLeavesPayload).toHaveBeenCalledTimes(2)
    })
  })
})
