import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import SalaryWorkspace from './SalaryWorkspace'

vi.mock('../../../components/salary/ApplySalary', () => ({
  default: () => <div>Apply Salary Mock</div>,
}))

vi.mock('../../../components/salary/SalaryRecord', () => ({
  default: () => <div>Salary Records Mock</div>,
}))

vi.mock('../../../components/salary/SalaryRecordDetailPage', () => ({
  default: () => <div>Salary Record Detail Mock</div>,
}))

vi.mock('../../../components/salary/OtherClaimApply', () => ({
  default: () => <div>Apply Other Claim Mock</div>,
}))

vi.mock('../../../components/salary/OtherClaimRecords', () => ({
  default: () => <div>Other Claim Records Mock</div>,
}))

vi.mock('../../../components/salary/OtherClaimRecordDetailPage', () => ({
  default: () => <div>Other Claim Record Detail Mock</div>,
}))

vi.mock('../../../components/salary/PaymentQueueRecords', () => ({
  default: () => <div>Payment Queue Mock</div>,
}))

vi.mock('../../../components/salary/SalarySettings', () => ({
  default: () => <div>Salary Settings Mock</div>,
}))

afterEach(() => {
  cleanup()
})

const LocationProbe = () => {
  const location = useLocation()

  return <div data-testid="location">{location.pathname}</div>
}

describe('SalaryWorkspace', () => {
  it('renders salary and other-claim module tabs for salary tab pages', () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/settings']}>
        <Routes>
          <Route
            path="/my/salary/apply"
            element={
              <>
                <SalaryWorkspace routeSection="apply" />
                <LocationProbe />
              </>
            }
          />
          <Route path="/my/salary/settings" element={<SalaryWorkspace routeSection="settings" />} />
          <Route
            path="/my/salary/records"
            element={
              <>
                <SalaryWorkspace routeSection="records" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const tabs = screen.getByRole('tablist', { name: 'My salary sections' })
    const tabLabels = within(tabs)
      .getAllByRole('tab')
      .map((tab) => tab.textContent)
    expect(tabLabels).toEqual([
      'My Payments',
      'Apply Salary',
      'Salary Records',
      'Apply Other Claim',
      'Other Claim Records',
      'Settings',
    ])
    expect(within(tabs).getByRole('tab', { name: 'Apply Salary' })).toBeInTheDocument()
    expect(within(tabs).getByRole('tab', { name: 'Salary Records' })).toBeInTheDocument()
    expect(within(tabs).getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Salary Settings Mock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.queryByText('Salary Settings')).not.toBeInTheDocument()
    expect(document.querySelector('.salary-workspace.card')).not.toBeInTheDocument()

    fireEvent.click(within(tabs).getByRole('tab', { name: 'Salary Records' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/records')
    expect(screen.getByText('Salary Records Mock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply Salary' })).not.toBeInTheDocument()

    fireEvent.click(
      within(screen.getByRole('tablist', { name: 'My salary sections' })).getByRole('tab', {
        name: 'Apply Salary',
      }),
    )
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/apply')
    expect(screen.getByText('Apply Salary Mock')).toBeInTheDocument()
  })

  it('renders the salary detail page when mounted on a detail URL', () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/records/1']}>
        <SalaryWorkspace />
      </MemoryRouter>,
    )

    expect(screen.getByText('Salary Record Detail Mock')).toBeInTheDocument()
    expect(screen.queryByText('Salary Records Mock')).not.toBeInTheDocument()
  })
})
