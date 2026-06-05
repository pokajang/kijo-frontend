import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import StaffLeaveEntitlementDetailPage from './StaffLeaveEntitlementDetailPage'

vi.mock('../../../components/datatable', async () => {
  const actual = await vi.importActual('../../../components/datatable')
  return {
    ...actual,
    DataTableDetailShell: ({ title, loading, error, record, children }) => (
      <section>
        <h1>{title}</h1>
        {loading ? <div>Loading...</div> : error ? <div>{error}</div> : record ? children : null}
      </section>
    ),
    DataTableDetailFields: ({ fields = [] }) => (
      <div>
        {fields.map((field) => (
          <div key={field.key} data-testid={`detail-field-${field.key}`}>
            <span>{field.label}</span>
            <span>{field.value}</span>
          </div>
        ))}
      </div>
    ),
    DataTableRecordList: ({ rows = [], dataColumns = [], renderCell, getActions }) => (
      <div>
        <div data-testid="detail-row-count">{rows.length}</div>
        {rows.map((row) => (
          <div key={row.id} data-testid={`detail-row-${row.id}`}>
            {dataColumns.map((column) => (
              <span key={column.key} data-testid={`detail-cell-${row.id}-${column.key}`}>
                {renderCell ? renderCell(row, column) : row[column.key]}
              </span>
            ))}
            {(getActions?.(row) || []).map((action) => (
              <button key={action.key} type="button" onClick={action.onClick}>
                {action.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    ),
    DataTableStatusBadge: ({ children }) => <span>{children}</span>,
  }
})

vi.mock('./actionHandlers', () => ({
  getStaffList: vi.fn(),
  getAllEntitlements: vi.fn(),
}))

import * as AH from './actionHandlers'

const currentYear = new Date().getFullYear()
const staff = { staff_id: 7, full_name: 'Azam Bin Husain', name_code: 'AZA' }
const entitlements = [
  {
    id: 70,
    staff_id: 7,
    full_name: 'Azam Bin Husain',
    name_code: 'AZA',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 14,
    used_days: 3,
    remaining: 11,
  },
  {
    id: 71,
    staff_id: 7,
    full_name: 'Azam Bin Husain',
    name_code: 'AZA',
    leave_type: 'Frozen Leave',
    year: currentYear - 1,
    total_days: 4,
    used_days: 1,
  },
]

const LocationProbe = () => {
  const location = useLocation()

  return (
    <div>
      <div data-testid="location">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state || {})}</div>
    </div>
  )
}

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/staff/leaves/entitlements/staff/7',
          state: {
            staff,
            entitlements,
            returnTo: '/staff/leaves/entitlements',
          },
        },
      ]}
    >
      <Routes>
        <Route
          path="/staff/leaves/entitlements/staff/:staffId"
          element={<StaffLeaveEntitlementDetailPage />}
        />
        <Route path="/staff/leaves/entitlements/:entitlementId/edit" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )

describe('StaffLeaveEntitlementDetailPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows current-year assigned used and balance rows for every assignable leave type', async () => {
    AH.getStaffList.mockResolvedValueOnce([staff])
    AH.getAllEntitlements.mockResolvedValueOnce(entitlements)

    renderPage()

    expect(screen.getByText('Leave Entitlement Details')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('detail-field-staff')).toHaveTextContent('Azam Bin Husain (AZA)')
    })

    expect(screen.getByTestId('detail-row-count')).toHaveTextContent('11')
    const annualRow = screen.getByTestId(`detail-row-annual-${currentYear}`)
    expect(within(annualRow).getByText('Annual')).toBeInTheDocument()
    expect(within(annualRow).getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByTestId(`detail-cell-annual-${currentYear}-assigned`)).toHaveTextContent('14')
    expect(screen.getByTestId(`detail-cell-annual-${currentYear}-used`)).toHaveTextContent('3')
    expect(screen.getByTestId(`detail-cell-annual-${currentYear}-balance`)).toHaveTextContent('11')

    const frozenRow = screen.getByTestId(`detail-row-frozen-leave-${currentYear}`)
    expect(within(frozenRow).getByText('Frozen Leave')).toBeInTheDocument()
    expect(within(frozenRow).getByText('Missing')).toBeInTheDocument()
    expect(screen.getByTestId(`detail-cell-frozen-leave-${currentYear}-balance`)).toHaveTextContent(
      '0',
    )
  })

  it('switches to all-time totals across entitlement years', async () => {
    AH.getStaffList.mockResolvedValueOnce([staff])
    AH.getAllEntitlements.mockResolvedValueOnce(entitlements)

    renderPage()

    fireEvent.change(await screen.findByLabelText('Entitlement period'), {
      target: { value: '__all_time__' },
    })

    const frozenRow = screen.getByTestId('detail-row-frozen-leave-__all_time__')
    expect(within(frozenRow).getByText('Frozen Leave')).toBeInTheDocument()
    expect(within(frozenRow).getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByTestId('detail-cell-frozen-leave-__all_time__-assigned')).toHaveTextContent(
      '4',
    )
    expect(screen.getByTestId('detail-cell-frozen-leave-__all_time__-used')).toHaveTextContent('1')
    expect(screen.getByTestId('detail-cell-frozen-leave-__all_time__-balance')).toHaveTextContent(
      '3',
    )
  })

  it('opens the edit route for an assigned yearly entitlement row', async () => {
    AH.getStaffList.mockResolvedValueOnce([staff])
    AH.getAllEntitlements.mockResolvedValueOnce(entitlements)

    renderPage()

    const annualRow = await screen.findByTestId(`detail-row-annual-${currentYear}`)
    fireEvent.click(within(annualRow).getByRole('button', { name: 'Edit' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/staff/leaves/entitlements/70/edit')
      expect(screen.getByTestId('location-state')).toHaveTextContent(
        `"returnTo":"/staff/leaves/entitlements/staff/7"`,
      )
    })
  })
})
