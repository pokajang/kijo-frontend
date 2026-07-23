import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OtherClaimApply from './OtherClaimApply'

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

describe('OtherClaimApply', () => {
  beforeEach(() => {
    window.localStorage.clear()
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
})
