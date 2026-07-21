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

  it('defaults mileage charge target to company and hides project selection', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))

    const chargeModeSelect = screen.getByRole('combobox', { name: 'Charge to' })
    expect(chargeModeSelect).toHaveValue('company')
    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument()
  })

  it('requires project selection when charge target mode is project', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))

    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-20' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Client site' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Site inspection' } })
    fireEvent.change(screen.getByLabelText('Mileage KM (optional)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getByText('Select a project before saving travel & mileage.'),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Project'), {
      target: { value: '101' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findAllByText(/Site inspection/)).length).toBeGreaterThan(0)
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

  it('shows selected project label in travel summary when saving with project charge mode', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-22' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Airport' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Client arrival' } })
    fireEvent.change(screen.getByLabelText('Project'), {
      target: { value: '101' },
    })
    fireEvent.change(screen.getByLabelText('Mileage KM (optional)'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const summaryText = await screen.findAllByText(/Project Alpha/)
    expect(summaryText.length).toBeGreaterThan(0)
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
    fireEvent.change(screen.getByLabelText('Travel expense category'), {
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
    fireEvent.change(screen.getByLabelText('Mileage KM (optional)'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Charge to'), {
      target: { value: 'project' },
    })
    fireEvent.change(await screen.findByLabelText('Project'), {
      target: { value: '101' },
    })
    fireEvent.change(screen.getByLabelText('Travel expense category'), {
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
    expect(screen.getAllByText(/RM 18\.00/).length).toBeGreaterThan(0)
  })

  it('edits a saved mileage row and preserves travel charge mode values', async () => {
    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Charge to' }), {
      target: { value: 'project' },
    })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-22' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Airport' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Client arrival' } })
    fireEvent.change(screen.getByLabelText('Mileage KM (optional)'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Project'), {
      target: { value: '101' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const [editButton] = await screen.findAllByRole('button', { name: /Edit Client arrival/ })
    fireEvent.click(editButton)

    const chargeModeSelect = await screen.findByRole('combobox', { name: 'Charge to' })
    expect(chargeModeSelect).toHaveValue('project')
    expect(screen.getByLabelText('Project')).toBeInTheDocument()
    fireEvent.change(chargeModeSelect, {
      target: { value: 'company' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getAllByText(/Client arrival/).length).toBeGreaterThan(0),
    )
    expect((await screen.findAllByText(/Client arrival/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Company/).length).toBeGreaterThan(0)
  })

  it('loads and prioritizes my projects first when listing charge projects', async () => {
    projectApiMock.listActiveProjectOptions
      .mockResolvedValueOnce([
        { id: 201, projectName: 'My Project', status: 'Active' },
        { id: 202, projectName: 'Other Project B', status: 'Active' },
      ])
      .mockResolvedValueOnce([{ id: 201, projectName: 'My Project', status: 'Active' }])

    render(<OtherClaimApply />)

    await screen.findByText('Other Claim Summary')
    fireEvent.click(screen.getByRole('button', { name: 'Add Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Travel & Mileage' }))
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
