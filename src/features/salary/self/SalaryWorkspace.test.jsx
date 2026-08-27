import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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
  default: ({ onConfigureMedicalEntitlement, resumeClaimType, resumeClaimMonth, resumeNotice }) => (
    <div>
      Apply Other Claim Mock
      {onConfigureMedicalEntitlement && (
        <button
          type="button"
          onClick={() => onConfigureMedicalEntitlement({ claimMonth: '2026-06' })}
        >
          Configure Medical Entitlement
        </button>
      )}
      {resumeClaimType && <span>Resume: {resumeClaimType}</span>}
      {resumeClaimMonth && <span>Resume month: {resumeClaimMonth}</span>}
      {resumeNotice && <span>{resumeNotice}</span>}
    </div>
  ),
}))

vi.mock('../../../components/salary/OtherClaimRecords', () => ({
  default: () => <div>Other Claim Records Mock</div>,
}))

vi.mock('../../../components/salary/OtherClaimRecordDetailPage', () => ({
  default: () => <div>Other Claim Record Detail Mock</div>,
}))

vi.mock('../../../components/salary/SalarySettings', () => ({
  default: ({ medicalEntitlementSetup, onMedicalEntitlementSaved }) => (
    <div>
      Salary Settings Mock
      {medicalEntitlementSetup && <span>Medical entitlement setup</span>}
      {onMedicalEntitlementSaved && (
        <button type="button" onClick={() => onMedicalEntitlementSaved({})}>
          Save Medical Entitlement
        </button>
      )}
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

const LocationProbe = () => {
  const location = useLocation()

  return <div data-testid="location">{location.pathname}</div>
}

const BackButton = () => {
  const navigate = useNavigate()

  return (
    <button type="button" onClick={() => navigate(-1)}>
      Back without saving
    </button>
  )
}

describe('SalaryWorkspace', () => {
  it('keeps salary and other claims as the only workspace tabs', () => {
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
          <Route
            path="/my/salary/other-claims/records"
            element={
              <>
                <SalaryWorkspace routeSection="other-claim-records" />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/my/salary/other-claims/apply"
            element={
              <>
                <SalaryWorkspace routeSection="other-claim-apply" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const tabs = screen.getByRole('navigation', { name: 'Salary workspace' })
    const tabLabels = within(tabs)
      .getAllByRole('link')
      .map((tab) => tab.textContent)
    expect(tabLabels).toEqual(['Salary', 'Other Claims'])
    expect(within(tabs).queryByRole('link', { name: 'Apply Salary' })).not.toBeInTheDocument()
    expect(within(tabs).queryByRole('link', { name: 'My Payments' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salary settings' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('Salary Settings Mock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.queryByText('Salary Settings')).not.toBeInTheDocument()
    expect(document.querySelector('.salary-workspace.card')).not.toBeInTheDocument()

    fireEvent.click(within(tabs).getByRole('link', { name: 'Salary' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/records')
    expect(screen.getByText('Salary Records Mock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply Salary' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Apply Salary' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/apply')
    expect(screen.getByText('Apply Salary Mock')).toBeInTheDocument()

    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Salary workspace' })).getByRole('link', {
        name: 'Other Claims',
      }),
    )
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/other-claims/records')
    expect(screen.getByText('Other Claim Records Mock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply Other Claim' })).toBeInTheDocument()
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

  it('round-trips from a medical claim to focused settings and back to claim review', () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/other-claims/apply']}>
        <Routes>
          <Route
            path="/my/salary/other-claims/apply"
            element={
              <>
                <SalaryWorkspace routeSection="other-claim-apply" />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/my/salary/settings"
            element={
              <>
                <SalaryWorkspace routeSection="settings" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Configure Medical Entitlement' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/settings')
    expect(screen.getByText('Medical entitlement setup')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Medical Entitlement' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/other-claims/apply')
    expect(screen.getByText('Resume: medical')).toBeInTheDocument()
    expect(screen.getByText('Resume month: 2026-06')).toBeInTheDocument()
    expect(
      screen.getByText('Medical entitlement updated. Review your medical claim before submitting.'),
    ).toBeInTheDocument()
  })

  it('restores the selected claim month when leaving entitlement setup without saving', () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/other-claims/apply']}>
        <Routes>
          <Route
            path="/my/salary/other-claims/apply"
            element={
              <>
                <SalaryWorkspace routeSection="other-claim-apply" />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/my/salary/settings"
            element={
              <>
                <SalaryWorkspace routeSection="settings" />
                <BackButton />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Configure Medical Entitlement' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/settings')

    fireEvent.click(screen.getByRole('button', { name: 'Back without saving' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/other-claims/apply')
    expect(screen.getByText('Resume: medical')).toBeInTheDocument()
    expect(screen.getByText('Resume month: 2026-06')).toBeInTheDocument()
    expect(
      screen.getByText('Medical claim draft restored. Review it before submitting.'),
    ).toBeInTheDocument()
  })
})
