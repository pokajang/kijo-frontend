import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import SalaryRecordDetailPage from './SalaryRecordDetailPage'
import dialog from '../dialog/dialogService'

const apiMock = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: apiMock.apiFetch,
  apiJson: apiMock.apiJson,
}))

vi.mock('../dialog/dialogService', () => ({
  default: {
    confirm: vi.fn(),
    alert: vi.fn(),
    prompt: vi.fn(),
  },
}))

describe('SalaryRecordDetailPage', () => {
  const record = {
    id: 10,
    salaryMonth: 'June 2026',
    salaryMonthValue: '2026-06',
    basicSalary: 3200,
    claimsTotal: 75,
    employeeDeductions: 374.05,
    payableSalary: 2900.95,
    status: 'Submitted',
    claims: [
      {
        id: 'allowance-1',
        type: 'Allowance',
        description: 'Payroll adjustment',
        amount: 75,
      },
    ],
    deductions: {
      employeeEpf: 352,
      employeeSocso: 15.65,
      employeeEis: 6.4,
      employeeTotal: 374.05,
      employerEpf: 416,
      employerSocso: 63.15,
      employerEis: 6.4,
      employerTotal: 485.55,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirm.mockResolvedValue(true)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:salary')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      close: vi.fn(),
      document: { title: '' },
      location: { href: '' },
      opener: null,
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    apiMock.apiFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'inline; filename="salary-claims-june-2026.pdf"' },
      blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
    })
    apiMock.apiJson.mockResolvedValue({
      record,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('loads salary detail data from the salary records API', async () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/records/10']}>
        <Routes>
          <Route path="/my/salary/records/:salaryRecordId" element={<SalaryRecordDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Payroll adjustment/).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/Salary Adjustments/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Parking receipt/)).not.toBeInTheDocument()
    expect(screen.getAllByText('-RM 374.05').length).toBeGreaterThan(0)
  })

  it('wires detail action card export claims, edit, and delete actions', async () => {
    const LocationProbe = () => {
      const location = useLocation()

      return (
        <div data-testid="location">
          {location.pathname}
          {location.state?.editRecord?.id ? `:${location.state.editRecord.id}` : ''}
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/my/salary/records/10']}>
        <Routes>
          <Route path="/my/salary/records/:salaryRecordId" element={<SalaryRecordDetailPage />} />
          <Route path="/my/salary/apply" element={<LocationProbe />} />
          <Route path="/my/salary/records" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Payroll adjustment/).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export Claims' }))
    await waitFor(() => {
      expect(apiMock.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('hr/salary/records/10/claims-pdf'),
      )
    })
    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/apply:10')
    })

    cleanup()
    render(
      <MemoryRouter initialEntries={['/my/salary/records/10']}>
        <Routes>
          <Route path="/my/salary/records/:salaryRecordId" element={<SalaryRecordDetailPage />} />
          <Route path="/my/salary/records" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Payroll adjustment/).length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(dialog.confirm).toHaveBeenCalledWith('Delete June 2026 salary application?', {
        title: 'Delete Salary Record',
        confirmText: 'Delete',
        confirmColor: 'danger',
      })
      expect(apiMock.apiJson).toHaveBeenCalledWith(
        expect.stringContaining('hr/salary/records/10'),
        { method: 'DELETE' },
      )
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/records')
  })

  it('exports payslip from the detail action card when approved and month closed', async () => {
    apiMock.apiJson.mockResolvedValue({
      record: {
        ...record,
        salaryMonth: 'January 2000',
        salaryMonthValue: '2000-01',
        status: 'Approved',
      },
    })
    apiMock.apiFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'inline; filename="salary-payslip-may-2026.pdf"' },
      blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
    })

    render(
      <MemoryRouter initialEntries={['/my/salary/records/10']}>
        <Routes>
          <Route path="/my/salary/records/:salaryRecordId" element={<SalaryRecordDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Payroll adjustment/).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export Payslip' }))

    await waitFor(() => {
      expect(apiMock.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('hr/salary/records/10/payslip-pdf'),
      )
    })
    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()
  })
})
