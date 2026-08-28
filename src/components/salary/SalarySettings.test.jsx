import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SalarySettings from './SalarySettings'

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiJson: apiMock.apiJson,
}))

const defaultProfile = () => ({
  basicSalary: '3000',
  effectiveMonth: '2026-05',
  vehicle: '',
  defaultMileageRate: '0.60',
  yearlyMedicalClaim: '0.00',
  notes: '',
  recurringAllowances: [],
  previousYearSnapshot: {
    year: '2025',
    source: 'missing',
    sourceLabel: 'Not configured',
    editable: true,
    available: false,
    message: '2025 snapshot not configured. Set in Salary Settings.',
    basicSalary: '',
    allowanceTotal: '',
    incrementAmount: '',
    total: '',
  },
})

describe('SalarySettings', () => {
  let profile

  const openAllowanceActionMenu = async () => {
    fireEvent.click(screen.getAllByRole('button', { name: 'Phone allowance actions' })[0])

    await waitFor(() => {
      expect(document.querySelector('.data-table-action-menu.show')).toBeTruthy()
    })

    return document.querySelector('.data-table-action-menu.show')
  }

  const openSettingsEditor = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Edit settings' }))
    return screen.findByLabelText('Basic Salary (RM)')
  }

  beforeEach(() => {
    profile = defaultProfile()
    apiMock.apiJson.mockImplementation(async (_url, options = {}) => {
      if (options.method === 'PUT') {
        const body = JSON.parse(options.body)
        profile = {
          basicSalary: String(body.basic_salary),
          effectiveMonth: body.effective_month,
          vehicle: body.vehicle || '',
          defaultMileageRate: String(body.default_mileage_rate),
          yearlyMedicalClaim: String(body.yearly_medical_claim),
          notes: body.notes || '',
          previousYearSnapshot: {
            year: String(body.previous_year_snapshot?.year || '2025'),
            source: 'manual',
            sourceLabel: 'Manual snapshot from Salary Settings',
            editable: true,
            available: true,
            message: '',
            basicSalary: String(body.previous_year_snapshot?.basic_salary ?? ''),
            allowanceTotal: String(body.previous_year_snapshot?.allowance_total ?? ''),
            incrementAmount: String(body.previous_year_snapshot?.increment_amount ?? ''),
            total: String(
              Number(body.previous_year_snapshot?.basic_salary || 0) +
                Number(body.previous_year_snapshot?.allowance_total || 0) +
                Number(body.previous_year_snapshot?.increment_amount || 0),
            ),
          },
          recurringAllowances: (body.recurring_allowances || []).map((allowance, index) => ({
            id: String(index + 1),
            description: allowance.description,
            amount: String(allowance.amount),
            startMonth: allowance.start_month || '',
            endMonth: '',
            active: true,
          })),
        }
        return { profile }
      }

      return { profile }
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('saves fixed salary and recurring allowance settings', async () => {
    render(<SalarySettings />)

    await openSettingsEditor()

    fireEvent.change(screen.getByLabelText('Basic Salary (RM)'), { target: { value: '4800' } })
    fireEvent.change(screen.getByLabelText('Effective From'), { target: { value: '2026-06' } })
    fireEvent.change(screen.getByLabelText('Annual Medical Entitlement (RM)'), {
      target: { value: '1200' },
    })
    fireEvent.click(screen.getByText('Previous year salary snapshot'))
    expect(
      screen.getByText(
        'No approved Dec 2025 salary record found. Configure this snapshot for Salary Claim PDF reference.',
      ),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Basic'), { target: { value: '3600' } })
    fireEvent.change(screen.getByLabelText('Allowance'), { target: { value: '240' } })
    fireEvent.change(screen.getByLabelText('Increment'), { target: { value: '100' } })
    expect(screen.getByLabelText('Total')).toHaveValue('3,940.00')
    expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add recurring allowance' }))
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Phone allowance' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '180' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save allowance' }))

    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()
    expect(screen.getAllByText('Phone allowance').length).toBeGreaterThan(0)
    expect(screen.queryByText('Payable Salary')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save salary settings' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Salary settings saved. Payable Salary now reflects the updated values.',
    )
    expect(profile.basicSalary).toBe('4800')
    expect(profile.effectiveMonth).toBe('2026-06')
    expect(profile.yearlyMedicalClaim).toBe('1200')
    expect(profile.previousYearSnapshot).toEqual(
      expect.objectContaining({
        year: '2025',
        basicSalary: '3600',
        allowanceTotal: '240',
        incrementAmount: '100',
      }),
    )
    expect(profile.recurringAllowances[0]).toEqual(
      expect.objectContaining({
        description: 'Phone allowance',
        amount: '180',
        active: true,
      }),
    )
  })

  it('shows validation for invalid fixed salary', async () => {
    render(<SalarySettings />)
    await openSettingsEditor()

    fireEvent.change(screen.getByLabelText('Basic Salary (RM)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save salary settings' }))

    expect(
      screen.getByText('Enter a fixed monthly salary greater than RM0.00.'),
    ).toBeInTheDocument()
  })

  it('guides medical entitlement setup and returns only after a successful save', async () => {
    const onMedicalEntitlementSaved = vi.fn()
    render(
      <SalarySettings
        medicalEntitlementSetup
        onMedicalEntitlementSaved={onMedicalEntitlementSaved}
      />,
    )

    const entitlementInput = await screen.findByLabelText('Annual Medical Entitlement (RM)')
    await waitFor(() => expect(entitlementInput).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: 'Save and Return to Medical Claim' }))
    expect(
      screen.getByText('Enter an annual medical entitlement greater than RM0.00.'),
    ).toBeInTheDocument()
    expect(onMedicalEntitlementSaved).not.toHaveBeenCalled()

    fireEvent.change(entitlementInput, { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and Return to Medical Claim' }))

    await waitFor(() =>
      expect(onMedicalEntitlementSaved).toHaveBeenCalledWith(
        expect.objectContaining({ yearlyMedicalClaim: '1200' }),
      ),
    )
  })

  it('allows focused medical setup when an unrelated basic salary is zero', async () => {
    profile = { ...defaultProfile(), basicSalary: '0' }
    const onMedicalEntitlementSaved = vi.fn()
    render(
      <SalarySettings
        medicalEntitlementSetup
        onMedicalEntitlementSaved={onMedicalEntitlementSaved}
      />,
    )

    const entitlementInput = await screen.findByLabelText('Annual Medical Entitlement (RM)')
    fireEvent.change(entitlementInput, { target: { value: '900' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and Return to Medical Claim' }))

    await waitFor(() => expect(onMedicalEntitlementSaved).toHaveBeenCalledTimes(1))
    expect(
      screen.queryByText('Enter a fixed monthly salary greater than RM0.00.'),
    ).not.toBeInTheDocument()
  })

  it('stays in medical entitlement setup when saving fails', async () => {
    const onMedicalEntitlementSaved = vi.fn()
    apiMock.apiJson.mockImplementation(async (_url, options = {}) => {
      if (options.method === 'PUT') throw new Error('Could not update entitlement.')
      return { profile }
    })

    render(
      <SalarySettings
        medicalEntitlementSetup
        onMedicalEntitlementSaved={onMedicalEntitlementSaved}
      />,
    )

    const entitlementInput = await screen.findByLabelText('Annual Medical Entitlement (RM)')
    fireEvent.change(entitlementInput, { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and Return to Medical Claim' }))

    expect(await screen.findByText('Could not update entitlement.')).toBeInTheDocument()
    expect(onMedicalEntitlementSaved).not.toHaveBeenCalled()
    expect(entitlementInput).toHaveValue(1200)
  })

  it('removes recurring allowance rows with the compact remove action', async () => {
    render(<SalarySettings />)
    await openSettingsEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Add recurring allowance' }))
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Phone allowance' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '180' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save allowance' }))
    fireEvent.click(within(await openAllowanceActionMenu()).getByText('Remove'))

    expect(screen.getByText('No recurring additions configured.')).toBeInTheDocument()
  })

  it('loads recurring allowance rows into the single draft row for editing', async () => {
    render(<SalarySettings />)
    await openSettingsEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Add recurring allowance' }))
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Phone allowance' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '180' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save allowance' }))

    fireEvent.click(within(await openAllowanceActionMenu()).getByText('Edit'))

    expect(screen.getByLabelText('Description')).toHaveValue('Phone allowance')
    expect(screen.getByLabelText('Amount')).toHaveValue(180)

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Internet allowance' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save allowance' }))

    expect(screen.getAllByText('Internet allowance').length).toBeGreaterThan(0)
    expect(screen.queryByText('Phone allowance')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()
  })

  it('does not show the apply salary shortcut before settings are saved', async () => {
    render(<SalarySettings />)
    await screen.findByRole('button', { name: 'Edit settings' })

    expect(screen.queryByRole('button', { name: 'Apply Salary' })).not.toBeInTheDocument()
  })

  it('shows a settings-saved notice that distinguishes settings from salary submission', async () => {
    render(<SalarySettings />)
    await openSettingsEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Save salary settings' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Salary settings saved. Payable Salary now reflects the updated values.',
    )
    expect(screen.queryByRole('button', { name: 'Apply Salary' })).not.toBeInTheDocument()
  })

  it('renders approved December previous-year snapshot values as read-only', async () => {
    profile = {
      ...defaultProfile(),
      previousYearSnapshot: {
        year: '2025',
        source: 'auto',
        sourceLabel: 'Approved Dec 2025 salary record',
        editable: false,
        available: true,
        message: '',
        basicSalary: '3800.00',
        allowanceTotal: '250.00',
        incrementAmount: '0.00',
        total: '4050.00',
      },
    }

    render(<SalarySettings />)
    await openSettingsEditor()
    fireEvent.click(screen.getByText('Previous year salary snapshot'))

    expect(screen.getByText('Using approved Dec 2025 salary record.')).toBeInTheDocument()
    expect(screen.getByLabelText('Basic')).toHaveValue(3800)
    expect(screen.getByLabelText('Basic')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Allowance')).toHaveValue(250)
    expect(screen.getByLabelText('Allowance')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Increment')).toHaveValue(0)
    expect(screen.getByLabelText('Increment')).toHaveAttribute('readonly')
  })
})
