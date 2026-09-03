import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FinancialSalaryRecordsPage from './FinancialSalaryRecordsPage'

vi.mock('../../../api/apiClient', () => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))

const { apiFetch, apiJson } = await import('../../../api/apiClient')

const buildRecord = (overrides = {}) => ({
  id: 1,
  staffId: 10,
  staffName: 'Staff Example',
  staffCode: 'STA',
  salaryMonth: 'May 2026',
  salaryMonthValue: '2026-05',
  basicSalary: 3000,
  claimsTotal: 380.6,
  employeeDeductions: 350.65,
  payableSalary: 3029.95,
  status: 'Submitted',
  submittedAt: '2026-05-30T12:00:00Z',
  workflow: {
    instanceId: 100,
    currentStepLabel: 'Check',
    availableActions: [
      { action: 'check', label: 'Check', tone: 'info' },
      { action: 'reject', label: 'Reject', tone: 'danger' },
    ],
    history: [],
  },
  ...overrides,
})

describe('FinancialSalaryRecordsPage', () => {
  let records

  beforeEach(() => {
    records = [buildRecord()]
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'inline; filename="salary-claims-may-2026.pdf"' },
      blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
    })
    apiJson.mockReset()
    apiJson.mockImplementation((url, options = {}) => {
      if (String(url).includes('/workflows/instances/') && options.method === 'POST') {
        return Promise.resolve({
          record: buildRecord({
            status: 'Checked',
            checkedBy: 20,
            checkedAt: '2026-05-30T13:00:00Z',
            checkedStatus: 'Checked',
            checkedRemarks: 'Checked',
            checkerName: 'Checker Example',
            checkerCode: 'CHK',
            workflow: {
              instanceId: 100,
              currentStepLabel: 'Approve',
              availableActions: [
                { action: 'approve', label: 'Approve', tone: 'success' },
                { action: 'reject', label: 'Reject', tone: 'danger' },
              ],
              history: [
                {
                  action: 'check',
                  label: 'Check',
                  statusTo: 'Checked',
                  actorName: 'Checker Example',
                  actorCode: 'CHK',
                  remarks: 'Checked',
                  actedAt: '2026-05-30T13:00:00Z',
                },
              ],
            },
          }),
        })
      }

      return Promise.resolve({
        records,
      })
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('loads all submitted salary records into a records-style data table', async () => {
    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('tab', { name: 'Review Salary' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Balance Sheet' })).toBeInTheDocument()
    expect(screen.getAllByText('Review Salary').length).toBeGreaterThan(0)
    expect(screen.getByText('Pending Check')).toBeInTheDocument()
    expect(screen.getByText('Pending Approval')).toBeInTheDocument()
    expect(screen.queryByText('Records')).not.toBeInTheDocument()
    expect(screen.queryByText('Rejected')).not.toBeInTheDocument()
    expect((await screen.findAllByText('Staff Example (STA)')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('May 2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Submitted')[0]).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /review details to continue/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 3,029.95').length).toBeGreaterThan(0)
    expect(screen.queryByText('Next: Check or Reject > Approve')).not.toBeInTheDocument()

    expect(apiJson.mock.calls[0][0]).toContain('hr/salary/financial-records')
  })

  it('shows an error state when the financial records API fails', async () => {
    apiJson.mockRejectedValueOnce(new Error('Unable to reach salary API.'))

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Unable to reach salary API.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByText('No submitted salary records found.')).not.toBeInTheDocument()
  })

  it('shows the salary empty state without zero-result pagination after loading', async () => {
    records = []

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    expect(
      (await screen.findAllByText('No submitted salary records found.')).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Page 1/1')).not.toBeInTheDocument()
  })

  it('directs an assigned reviewer to inspect record details before deciding', async () => {
    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    expect(
      (await screen.findAllByRole('button', { name: /review details to continue/i })).length,
    ).toBeGreaterThan(0)
  })

  it('keeps workflow actions out of the kebab menu', async () => {
    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    fireEvent.click((await screen.findAllByLabelText('Actions'))[0])

    await waitFor(() => {
      const menuItems = Array.from(document.querySelectorAll('.record-action-menu .dropdown-item'))
        .map((item) => item.textContent?.trim())
        .filter(Boolean)

      expect(menuItems).toContain('Export Claims')
      expect(menuItems).not.toContain('Check')
      expect(menuItems).not.toContain('Reject')
    })
  })

  it('renders restricted salary rows without leaking staff or salary values', async () => {
    records = [
      buildRecord({
        staffId: null,
        staffName: 'Restricted',
        staffCode: '',
        basicSalary: null,
        claimsTotal: null,
        employeeDeductions: null,
        payableSalary: null,
        canViewSalaryDetails: false,
        salaryRestricted: true,
        workflow: {
          instanceId: 100,
          currentStepLabel: 'Check',
          availableActions: [],
          history: [],
        },
      }),
    ]

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Worklist'), { target: { value: 'all' } })
    expect((await screen.findAllByText('Restricted')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Staff Example (STA)')).not.toBeInTheDocument()
    expect(screen.getByText('Financial totals')).toBeInTheDocument()
    expect(screen.queryByLabelText('Actions')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /review details to continue/i }),
    ).not.toBeInTheDocument()
  })

  it('sums only visible net pay in stats', async () => {
    records = [
      buildRecord(),
      buildRecord({
        id: 2,
        staffId: null,
        staffName: 'Restricted',
        staffCode: '',
        basicSalary: null,
        claimsTotal: null,
        employeeDeductions: null,
        payableSalary: null,
        canViewSalaryDetails: false,
        salaryRestricted: true,
        workflow: {
          instanceId: 101,
          currentStepLabel: 'Check',
          availableActions: [],
          history: [],
        },
      }),
    ]

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Visible Payable')).toBeInTheDocument()
    expect(screen.getAllByText('RM 3,029.95').length).toBeGreaterThan(0)
    expect(screen.queryByText('RM 6,059.90')).not.toBeInTheDocument()
  })

  it('shows pending check when the submitted row is not actionable for the current staff', async () => {
    records = [
      buildRecord({
        workflow: {
          instanceId: 100,
          currentStepLabel: 'Check',
          availableActions: [],
          history: [],
        },
      }),
    ]

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Worklist'), { target: { value: 'all' } })
    expect((await screen.findAllByText('Pending check')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^check$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument()
  })

  it('shows a detail-review action for an actionable checked row', async () => {
    records = [
      buildRecord({
        status: 'Checked',
        workflow: {
          instanceId: 101,
          currentStepLabel: 'Approve',
          availableActions: [
            { action: 'approve', label: 'Approve', tone: 'success' },
            { action: 'reject', label: 'Reject', tone: 'danger' },
          ],
          history: [
            {
              action: 'check',
              label: 'Check',
              statusTo: 'Checked',
              actorName: 'Checker Example',
              actorCode: 'CHK',
              actedAt: '2026-05-30T13:00:00Z',
            },
          ],
        },
      }),
    ]

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    expect(
      (await screen.findAllByRole('button', { name: /review details to continue/i })).length,
    ).toBeGreaterThan(0)
  })

  it('shows pending approval when the checked row is not actionable for the current staff', async () => {
    records = [
      buildRecord({
        status: 'Checked',
        workflow: {
          instanceId: 101,
          currentStepLabel: 'Approve',
          availableActions: [],
          history: [],
        },
      }),
    ]

    render(
      <MemoryRouter>
        <FinancialSalaryRecordsPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Worklist'), { target: { value: 'all' } })
    expect((await screen.findAllByText('Pending approval')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument()
  })
})
