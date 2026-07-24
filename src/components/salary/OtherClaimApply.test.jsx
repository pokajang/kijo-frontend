import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OtherClaimApply from './OtherClaimApply'
import { readOtherClaimDraft } from './otherClaimDraftStorage'
import { getCurrentClaimMonth } from './other-claim/model/otherClaimModel'

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
}))
const projectApiMock = vi.hoisted(() => ({
  listActiveProjectOptions: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: vi.fn(),
  apiJson: apiMock.apiJson,
}))
vi.mock('../../views/project/manage/projectApi', () => ({
  listActiveProjectOptions: projectApiMock.listActiveProjectOptions,
}))

const openTravelClaim = async () => {
  await screen.findByText('Other Claim Summary')
  fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
  fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))
}

const completeMileage = ({ date = '2026-07-20', purpose = 'Site inspection' } = {}) => {
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
  fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Client site' } })
  fireEvent.change(screen.getByLabelText('Business purpose'), { target: { value: purpose } })
}

const draftAllowanceRecord = {
  id: 42,
  claimMonth: 'July 2026',
  claimMonthValue: '2026-07',
  claimsTotal: 50,
  status: 'Draft',
  claims: [
    {
      id: 'allowance-1',
      type: 'Allowance',
      date: '2026-07-20',
      description: 'Meal allowance',
      amount: 50,
    },
  ],
}

describe('OtherClaimApply', () => {
  beforeEach(() => {
    window.localStorage.clear()
    apiMock.apiJson.mockReset()
    projectApiMock.listActiveProjectOptions.mockReset()
    projectApiMock.listActiveProjectOptions.mockResolvedValue([
      { id: 101, projectName: 'Project Alpha', clientName: 'Acme Group' },
    ])
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

  it('preserves the medical draft before opening entitlement setup', async () => {
    const onConfigureMedicalEntitlement = vi.fn()
    apiMock.apiJson.mockImplementation(async (url) => {
      if (String(url).includes('hr/salary/profile')) {
        return {
          profile: {
            basicSalary: '3000',
            effectiveMonth: getCurrentClaimMonth(),
            defaultMileageRate: '0.60',
            yearlyMedicalClaim: '0',
            recurringAllowances: [],
          },
        }
      }
      return { record: null }
    })

    render(<OtherClaimApply onConfigureMedicalEntitlement={onConfigureMedicalEntitlement} />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'June 2026' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Medical' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-24' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Clinic consultation' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '85' } })

    fireEvent.click(screen.getByRole('button', { name: 'Set Medical Entitlement' }))

    expect(onConfigureMedicalEntitlement).toHaveBeenCalledWith({ claimMonth: '2026-06' })
    expect(readOtherClaimDraft({ claimMonth: '2026-06' })).toEqual(
      expect.objectContaining({
        formData: expect.objectContaining({
          medicalDate: '2026-07-24',
          medicalDescription: 'Clinic consultation',
          medicalAmount: '85',
        }),
      }),
    )
  })

  it('stays on the claim when the medical draft cannot be preserved locally', async () => {
    const onConfigureMedicalEntitlement = vi.fn()
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })
    apiMock.apiJson.mockImplementation(async (url) => {
      if (String(url).includes('hr/salary/profile')) {
        return {
          profile: {
            basicSalary: '3000',
            effectiveMonth: getCurrentClaimMonth(),
            defaultMileageRate: '0.60',
            yearlyMedicalClaim: '0',
            recurringAllowances: [],
          },
        }
      }
      return { record: null }
    })

    render(<OtherClaimApply onConfigureMedicalEntitlement={onConfigureMedicalEntitlement} />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Medical' }))
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Clinic consultation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Set Medical Entitlement' }))

    expect(onConfigureMedicalEntitlement).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        'Your medical claim could not be preserved in this browser. Keep this page open and try again before opening Salary Settings.',
      ),
    ).toBeInTheDocument()
  })

  it('reopens the medical editor with return guidance after entitlement setup', async () => {
    render(
      <OtherClaimApply
        resumeClaimType="medical"
        resumeClaimMonth="2026-06"
        resumeNotice="Medical entitlement updated. Review your medical claim before submitting."
      />,
    )

    expect(
      await screen.findByText(
        'Medical entitlement updated. Review your medical claim before submitting.',
      ),
    ).toBeInTheDocument()
    expect(document.getElementById('otherClaimMonth')).toHaveValue('2026-06')
    await waitFor(() => expect(screen.getByLabelText('Date')).toHaveFocus())
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('defaults travel claims to mileage charged to the company', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()

    expect(screen.getByRole('combobox', { name: 'What are you claiming?' })).toHaveValue('mileage')
    expect(screen.getByRole('combobox', { name: 'Charge to' })).toHaveValue('company')
    expect(screen.getByRole('combobox', { name: 'Distance method' })).toHaveValue(
      'return_same_route',
    )
    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument()
  })

  it('requires a project before saving a project-charged mileage claim', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()

    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })
    completeMileage()
    fireEvent.change(screen.getByLabelText('One-way distance (KM)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getByText('Select a project before saving this travel claim.'),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '101' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Site inspection/)).length).toBeGreaterThan(0)
  })

  it('calculates a one-way mileage claim without doubling the entered distance', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()

    completeMileage()
    fireEvent.change(screen.getByLabelText('Distance method'), { target: { value: 'one_way' } })
    fireEvent.change(screen.getByLabelText('One-way distance (KM)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Site inspection/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/12 KM one-way/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 7.20').length).toBeGreaterThan(0)
  })

  it('uses the entered total when return legs use different routes', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()

    completeMileage()
    fireEvent.change(screen.getByLabelText('Distance method'), {
      target: { value: 'total_distance' },
    })
    fireEvent.change(screen.getByLabelText('Total distance travelled (KM)'), {
      target: { value: '30' },
    })

    expect(screen.getByText(/30 KM x RM 0\.60 = RM 18\.00/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getAllByText(/30 KM total distance travelled/).length).toBeGreaterThan(0)
  })

  it('shows only taxi fields and requires taxi evidence instead of mileage input', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()

    fireEvent.change(screen.getByLabelText('What are you claiming?'), { target: { value: 'taxi' } })
    expect(screen.getByLabelText('Pickup')).toBeInTheDocument()
    expect(screen.getByLabelText('Drop-off')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Choose files for Taxi / e-hailing receipt' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('One-way distance (KM)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Distance method')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-22' } })
    fireEvent.change(screen.getByLabelText('Pickup'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('Drop-off'), { target: { value: 'Airport' } })
    fireEvent.change(screen.getByLabelText('Business purpose'), {
      target: { value: 'Client arrival' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getByText('Attach the required travel supporting evidence before saving.'),
    ).toBeInTheDocument()

    fireEvent.change(document.getElementById('otherTravelEvidence'), {
      target: {
        files: [new File(['receipt'], 'taxi-receipt.pdf', { type: 'application/pdf' })],
      },
    })
    await waitFor(() => expect(screen.getByText(/taxi-receipt\.pdf/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Client arrival/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Taxi \/ e-hailing/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 24.00').length).toBeGreaterThan(0)
  })

  it('shows the selected project label in the travel summary', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()
    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })
    completeMileage({ date: '2026-07-22', purpose: 'Client arrival' })
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '101' } })
    fireEvent.change(screen.getByLabelText('One-way distance (KM)'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Project Alpha/)).length).toBeGreaterThan(0)
  })

  it('edits a mileage claim and preserves its project charge selection', async () => {
    render(<OtherClaimApply />)
    await openTravelClaim()
    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })
    completeMileage({ date: '2026-07-22', purpose: 'Client arrival' })
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '101' } })
    fireEvent.change(screen.getByLabelText('One-way distance (KM)'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const [editButton] = await screen.findAllByRole('button', { name: /Edit Client arrival/ })
    fireEvent.click(editButton)

    expect(await screen.findByRole('combobox', { name: 'Charge to' })).toHaveValue('project')
    expect(screen.getByLabelText('Project')).toHaveValue('101')
  })

  it('loads and prioritizes my projects first when listing charge projects', async () => {
    projectApiMock.listActiveProjectOptions
      .mockResolvedValueOnce([
        { id: 201, projectName: 'My Project', status: 'Active' },
        { id: 202, projectName: 'Other Project B', status: 'Active' },
      ])
      .mockResolvedValueOnce([{ id: 201, projectName: 'My Project', status: 'Active' }])

    render(<OtherClaimApply />)
    await openTravelClaim()
    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })

    const projectSelect = await screen.findByLabelText('Project')
    const projectOptions = within(projectSelect).getAllByRole('option')
    const visibleProjectOptions = projectOptions.map((option) => option.textContent).filter(Boolean)
    const myProjects = ['My Project', 'Other Project B']
    const myProjectIndices = myProjects
      .map((label) => visibleProjectOptions.indexOf(label))
      .filter((index) => index !== -1)
    expect(myProjectIndices).toHaveLength(2)
    expect(myProjectIndices[0]).toBeLessThan(myProjectIndices[1])
  })

  it('keeps the form editable and explains when explicit draft sync blocks submission', async () => {
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (String(url).includes('hr/salary/profile')) {
        return {
          profile: {
            defaultMileageRate: '0.60',
            yearlyMedicalClaim: '1200',
            recurringAllowances: [],
          },
        }
      }
      if (String(url).includes('hr/salary/other-claims/draft') && options.method === 'POST') {
        throw new Error('Network unavailable')
      }
      return { record: null }
    })

    render(<OtherClaimApply editRecord={draftAllowanceRecord} />)
    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(
      await screen.findByText(
        'Submission stopped because the draft could not sync. Network unavailable',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getAllByText(/Meal allowance/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Apply Another' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  it('keeps the form editable when final submission validation fails after draft sync', async () => {
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (String(url).includes('hr/salary/profile')) {
        return {
          profile: {
            defaultMileageRate: '0.60',
            yearlyMedicalClaim: '1200',
            recurringAllowances: [],
          },
        }
      }
      if (String(url).includes('hr/salary/other-claims/draft') && options.method === 'POST') {
        return { record: draftAllowanceRecord }
      }
      if (String(url).endsWith('hr/salary/other-claims') && options.method === 'POST') {
        throw new Error('The claim could not be submitted.')
      }
      return { record: null }
    })

    render(<OtherClaimApply editRecord={draftAllowanceRecord} />)
    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByText('The claim could not be submitted.')).toBeInTheDocument()
    expect(screen.getAllByText(/Meal allowance/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Apply Another' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  it('does not create or clear a monthly draft when resubmitting a rejected claim', async () => {
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (String(url).includes('hr/salary/profile')) {
        return {
          profile: {
            defaultMileageRate: '0.60',
            yearlyMedicalClaim: '1200',
            recurringAllowances: [],
          },
        }
      }
      if (String(url).endsWith('hr/salary/other-claims') && options.method === 'POST') {
        return {
          record: {
            ...draftAllowanceRecord,
            id: 84,
            status: 'Submitted',
          },
          mail_sent: true,
        }
      }
      return { record: null }
    })

    render(
      <OtherClaimApply
        editRecord={{ ...draftAllowanceRecord, status: 'Rejected', recordVersion: 2 }}
        amendmentReason="Receipt corrected"
      />,
    )
    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByText('Other claim was submitted for review.')).toBeInTheDocument()
    expect(
      apiMock.apiJson.mock.calls.filter(([url]) =>
        String(url).includes('hr/salary/other-claims/draft'),
      ),
    ).toHaveLength(0)
  })
})
