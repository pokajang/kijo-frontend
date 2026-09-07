import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LeaveWorkspace from './LeaveWorkspace'

vi.mock('../../../components/leave/ApplyLeave', () => ({
  default: () => <div>Apply Leave Mock</div>,
}))

vi.mock('../../../components/leave/LeaveRecord', () => ({
  default: () => <div>Leave Records Mock</div>,
}))

vi.mock('../../../hooks/datatable', () => ({
  useDataTableStatsVisibility: () => ({
    statsVisible: true,
    controlsVisible: true,
    toggleStatsVisible: vi.fn(),
    toggleControlsVisible: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
})

const LocationProbe = () => {
  const location = useLocation()

  return <div data-testid="location">{location.pathname}</div>
}

describe('LeaveWorkspace', () => {
  it('uses the shared actions-only mobile header for records and preserves apply navigation', () => {
    render(
      <MemoryRouter initialEntries={['/my/leaves']}>
        <Routes>
          <Route
            path="/my/leaves"
            element={
              <>
                <LeaveWorkspace />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/my/leaves/apply"
            element={
              <>
                <LeaveWorkspace routeSection="apply" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Leave Records').closest('.data-table-card-header')).toHaveClass(
      'data-table-card-header--mobile-actions-only',
    )
    const actionRow = document.querySelector('.mobile-workspace-action-row')
    expect(actionRow).toBeInTheDocument()
    expect(actionRow.querySelector('button')).toHaveAccessibleName('Apply Leave')

    fireEvent.click(screen.getByRole('button', { name: 'Apply Leave' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/my/leaves/apply')
    expect(screen.getByText('Apply Leave Mock')).toBeInTheDocument()
    const applyHeader = screen.getByText('Apply Leave').closest('.data-table-card-header')
    expect(applyHeader).not.toHaveClass('data-table-card-header--mobile-actions-only')
    expect(applyHeader).toHaveClass('leave-workspace-header--apply')
  })
})
