import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import OtherClaimApply from './OtherClaimApply'

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: vi.fn(),
  apiJson: apiMock.apiJson,
}))

describe('OtherClaimApply', () => {
  beforeEach(() => {
    window.localStorage.clear()
    apiMock.apiJson.mockImplementation(async (url) => {
      if (String(url).includes('hr/salary/profile')) {
        return {
          profile: {
            basicSalary: '3000',
            effectiveMonth: new Date().toLocaleDateString('en-CA').slice(0, 7),
            defaultMileageRate: '0.60',
            yearlyMedicalClaim: '1200',
            recurringAllowances: [],
          },
        }
      }
      if (String(url).includes('hr/salary/other-claims/draft')) {
        return { record: null }
      }
      return {}
    })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('opens the default claim entry fields from Add Claim and keeps all claim types selectable', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))

    expect(screen.getByRole('heading', { name: 'Adjustment Type' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non-Recurring Allowance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expense' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Medical' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Travel & Mileage' })).toBeInTheDocument()
    expect(screen.getByLabelText('Attachment (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Claim month')).toBeInTheDocument()
  })

  it('captures travel purpose and supports one-way mileage without forced doubling', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-20' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Client site' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Site inspection' } })
    fireEvent.change(screen.getByLabelText('Trip type'), { target: { value: 'one_way' } })
    fireEvent.change(screen.getByLabelText('Mileage KM (optional)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Site inspection/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/12 KM one-way/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 7.20').length).toBeGreaterThan(0)
  })

  it('does not silently discard partial travel expense details', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-20' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Client site' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Site inspection' } })
    fireEvent.change(screen.getByLabelText('Mileage KM (optional)'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Parking / taxi / toll / others'), {
      target: { value: 'parking' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getByText('Enter a valid travel expense amount or clear the expense details.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Purpose')).toHaveValue('Site inspection')
  })

  it('supports an expense-only travel row from the workbook without requiring mileage', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-22' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Airport' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Client arrival' } })
    fireEvent.change(screen.getByLabelText('Charge to project/company'), {
      target: { value: 'Project Alpha' },
    })
    fireEvent.change(screen.getByLabelText('Parking / taxi / toll / others'), {
      target: { value: 'combined' },
    })
    fireEvent.change(screen.getByLabelText('Expense amount'), { target: { value: '18' } })
    fireEvent.change(screen.getByLabelText('Travel expense receipt'), {
      target: {
        files: [new File(['receipt'], 'travel-receipt.pdf', { type: 'application/pdf' })],
      },
    })

    await waitFor(() => expect(screen.getByText(/travel-receipt\.pdf/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Client arrival/)).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Parking \/ taxi \/ toll \/ others RM 18\.00/).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 18.00').length).toBeGreaterThan(0)
  })
})
