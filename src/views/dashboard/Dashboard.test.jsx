import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Dashboard from './Dashboard'

let mockUser = {
  name_code: 'ALP',
  full_name: 'Alpha Staff',
  roles: ['Manager'],
}

vi.mock('../../auth/AuthProvider', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
    }),
  }
})

vi.mock('./sales/SalesDashboard', () => ({
  default: () => <div>Sales dashboard mock</div>,
}))

vi.mock('./crm/CrmDashboard', () => ({
  default: () => <div>CRM dashboard mock</div>,
}))

vi.mock('./financial/FinancialDashboard', () => ({
  default: () => <div>Financial dashboard mock</div>,
}))

vi.mock('./monitoring/MonitoringDashboard', () => ({
  default: () => <div>Monitoring dashboard mock</div>,
}))

vi.mock('./workload/WorkloadDashboard', () => ({
  default: () => <div>Workload dashboard mock</div>,
}))

describe('Dashboard workload tab', () => {
  afterEach(() => {
    cleanup()
    mockUser = {
      name_code: 'ALP',
      full_name: 'Alpha Staff',
      roles: ['Manager'],
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the Workload Tracking tab route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/workload']}>
        <Routes>
          <Route path="/dashboard/:dashboardTab" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Workload Tracking')).toBeInTheDocument()
    expect(screen.getByText('Workload dashboard mock')).toBeInTheDocument()
  })

  it('opens the previous-month management report for dashboard managers', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const expectedMonth = `${previousMonth.getFullYear()}-${String(
      previousMonth.getMonth() + 1,
    ).padStart(2, '0')}`

    render(
      <MemoryRouter initialEntries={['/dashboard/sales']}>
        <Routes>
          <Route path="/dashboard/:dashboardTab" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /monthly report/i }))

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining(`stats/monthly-dashboard-report/pdf?month=${expectedMonth}`),
      '_blank',
    )
  })

  it('hides the management report button from non-management users', async () => {
    mockUser = {
      name_code: 'STF',
      full_name: 'Staff User',
      roles: ['Staff'],
    }

    render(
      <MemoryRouter initialEntries={['/dashboard/sales']}>
        <Routes>
          <Route path="/dashboard/:dashboardTab" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sales dashboard mock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /monthly report/i })).not.toBeInTheDocument()
  })
})
