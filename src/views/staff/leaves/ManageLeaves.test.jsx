import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import ManageLeaves from './ManageLeaves'
import * as AH from './actionHandlers'

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
  }) => (
    <div>
      <span>All Leave Records</span>
      <span data-testid="can-recommend">{String(canRecommendActions)}</span>
      <span data-testid="can-approve">{String(canApproveActions)}</span>
      {onManageEntitlements && <button type="button">Entitlements</button>}
      {onAssignLeave && <button type="button">Assign Leave</button>}
      {onManageWorkflow && <button type="button">Workflows</button>}
    </div>
  ),
}))

vi.mock('./SectionViewAssignments', () => ({
  default: () => <div>Leave Entitlements</div>,
}))

vi.mock('./SectionAssignLeaves', () => ({
  default: () => <div>Assign Leave Entitlement</div>,
}))

vi.mock('./actionHandlers', () => ({
  getAllLeaves: vi.fn(async () => []),
  getAllLeavesPayload: vi.fn(async () => ({ leaves: [], actionPermissions: null })),
  getStaffList: vi.fn(async () => []),
  getAllEntitlements: vi.fn(async () => []),
}))

const LocationProbe = () => {
  const location = useLocation()

  return <div data-testid="location">{location.pathname}</div>
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
})
