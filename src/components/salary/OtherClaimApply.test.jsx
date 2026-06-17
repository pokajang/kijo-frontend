import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Mileage' })).toBeInTheDocument()
    expect(screen.getByLabelText('Attachment (optional)')).toBeInTheDocument()
  })
})
