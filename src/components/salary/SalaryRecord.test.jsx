import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import SalaryRecord from './SalaryRecord'
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

describe('SalaryRecord', () => {
  const getOpenActionMenu = async () => {
    await waitFor(() => {
      expect(document.querySelector('.data-table-action-menu.show')).toBeTruthy()
    })

    const menus = document.querySelectorAll('.data-table-action-menu.show')

    return menus[menus.length - 1]
  }

  const detailRecord = {
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
        id: 'expense-1',
        type: 'Expense',
        date: '2026-06-10',
        description: 'Parking receipt',
        meta: 'Manual adjustment',
        amount: 75,
        attachment: { name: 'parking.pdf' },
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirm.mockResolvedValue(true)
    dialog.prompt.mockResolvedValue('Corrected amount')
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
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (options.method === 'DELETE') return { status: 'success' }
      if (String(url).includes('hr/salary/records/10')) return { record: detailRecord }

      return {
        records: [
          {
            id: 10,
            salaryMonth: 'June 2026',
            salaryMonthValue: '2026-06',
            basicSalary: 3200,
            claimsTotal: 75,
            employeeDeductions: 374.05,
            payableSalary: 2900.95,
            status: 'Submitted',
          },
        ],
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('loads salary records from the salary records API', async () => {
    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('June 2026').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('RM 75.00').length).toBeGreaterThan(0)
  })

  it('presents rejected salary records as a final decision rather than an action needed', async () => {
    apiMock.apiJson.mockResolvedValue({
      records: [{ ...detailRecord, status: 'Rejected', claims: undefined }],
    })

    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('Rejected')).length).toBeGreaterThan(0)
    expect(screen.getByText('final decision')).toBeInTheDocument()
    expect(screen.queryByText('Action Needed')).not.toBeInTheDocument()
    expect(screen.queryByText('revise rejected records')).not.toBeInTheDocument()
  })

  it('wires dropdown export claims, edit, and delete actions', async () => {
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
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <Routes>
          <Route
            path="/my/salary/records"
            element={
              <>
                <SalaryRecord />
                <LocationProbe />
              </>
            }
          />
          <Route path="/my/salary/apply" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findAllByText('June 2026')

    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    fireEvent.click(within(await getOpenActionMenu()).getByText('Export Salary'))

    await waitFor(() => {
      expect(apiMock.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('hr/salary/records/10/claims-pdf'),
      )
    })
    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    fireEvent.click(within(await getOpenActionMenu()).getByText('Edit'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/my/salary/apply:10')
    })

    cleanup()
    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    await screen.findAllByText('June 2026')
    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    fireEvent.click(within(await getOpenActionMenu()).getByText('Delete'))

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
  })

  it('exports payslip from the row menu when the approved salary month is closed', async () => {
    apiMock.apiJson.mockResolvedValue({
      records: [
        {
          ...detailRecord,
          salaryMonth: 'January 2000',
          salaryMonthValue: '2000-01',
          status: 'Approved',
        },
      ],
    })
    apiMock.apiFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'inline; filename="salary-payslip-may-2026.pdf"' },
      blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
    })

    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    await screen.findAllByText('January 2000')

    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    fireEvent.click(within(await getOpenActionMenu()).getByText('Generate Payslip'))

    await waitFor(() => {
      expect(apiMock.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('hr/salary/records/10/payslip-pdf'),
      )
    })
    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()
  })

  it('prompts for reviewed salary edit and delete reasons', async () => {
    const LocationProbe = () => {
      const location = useLocation()

      return (
        <div data-testid="location">
          {location.pathname}
          {location.state?.editRecord?.id ? `:${location.state.editRecord.id}` : ''}
          {location.state?.amendmentReason ? `:${location.state.amendmentReason}` : ''}
        </div>
      )
    }
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (options.method === 'DELETE') return { status: 'success' }
      if (String(url).includes('hr/salary/records/10')) {
        return { record: { ...detailRecord, status: 'Checked' } }
      }
      return { records: [{ ...detailRecord, status: 'Checked', claims: undefined }] }
    })

    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <Routes>
          <Route
            path="/my/salary/records"
            element={
              <>
                <SalaryRecord />
                <LocationProbe />
              </>
            }
          />
          <Route path="/my/salary/apply" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findAllByText('June 2026')
    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    fireEvent.click(within(await getOpenActionMenu()).getByText('Edit'))

    await waitFor(() => {
      expect(dialog.prompt).toHaveBeenCalledWith(
        expect.stringContaining('restart the workflow'),
        expect.objectContaining({ title: 'Edit Reviewed Salary Record', required: true }),
      )
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/my/salary/apply:10:Corrected amount',
      )
    })

    cleanup()
    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    await screen.findAllByText('June 2026')
    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    fireEvent.click(within(await getOpenActionMenu()).getByText('Delete'))

    await waitFor(() => {
      expect(apiMock.apiJson).toHaveBeenCalledWith(
        expect.stringContaining('hr/salary/records/10'),
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Corrected amount' }),
        },
      )
    })
  })

  it('shows paid salary edit and delete actions disabled', async () => {
    apiMock.apiJson.mockResolvedValue({
      records: [{ ...detailRecord, status: 'Paid', claims: undefined }],
    })

    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    await screen.findAllByText('June 2026')
    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    const menu = await getOpenActionMenu()

    expect(within(menu).getByText('Edit').closest('button, a')).toHaveAttribute('aria-disabled')
    expect(within(menu).getByText('Delete').closest('button, a')).toHaveAttribute('aria-disabled')
  })

  it('keeps the payslip row action visible but inactive before the salary month closes', async () => {
    apiMock.apiJson.mockResolvedValue({
      records: [
        {
          ...detailRecord,
          salaryMonth: 'December 2999',
          salaryMonthValue: '2999-12',
          status: 'Approved',
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/my/salary/records']}>
        <SalaryRecord />
      </MemoryRouter>,
    )

    await screen.findAllByText('December 2999')

    fireEvent.click(screen.getAllByLabelText('Actions')[0])
    const payslipAction = within(await getOpenActionMenu()).getByText('Generate Payslip')

    expect(payslipAction).toBeInTheDocument()
    fireEvent.click(payslipAction)
    expect(apiMock.apiFetch).not.toHaveBeenCalled()
  })
})
