import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ApplySalary, {
  AttachmentInput,
  AttachmentPreviewModal,
  ClaimDraftActions,
  FormPanelHeading,
} from './ApplySalary'
import { getSalaryRecords } from './salaryRecordStorage'

const apiMock = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: apiMock.apiFetch,
  apiJson: apiMock.apiJson,
}))

const defaultProfile = () => ({
  basicSalary: '3000',
  effectiveMonth: new Date().toLocaleDateString('en-CA').slice(0, 7),
  defaultMileageRate: '0.60',
  yearlyMedicalClaim: '1200',
  notes: '',
  recurringAllowances: [],
})

describe('ApplySalary', () => {
  let profile
  let records

  const ApplySalaryHarness = (props) => {
    const [showAdjustments, setShowAdjustments] = React.useState(Boolean(props.editRecord))

    return (
      <>
        {!showAdjustments && (
          <button type="button" onClick={() => setShowAdjustments(true)}>
            Add Adjustment
          </button>
        )}
        <ApplySalary
          {...props}
          showAdjustments={showAdjustments}
          onShowAdjustmentsChange={setShowAdjustments}
        />
      </>
    )
  }

  it('keeps the shared claim controls available from the legacy module exports', () => {
    expect(AttachmentInput).toBeTypeOf('function')
    expect(AttachmentPreviewModal).toBeTypeOf('function')
    expect(ClaimDraftActions).toBeTypeOf('function')
    expect(FormPanelHeading).toBeTypeOf('function')
  })

  const renderApplySalary = async (ui = <ApplySalaryHarness />) => {
    const result = render(ui)

    const loading = screen.queryByText('Loading salary settings...')
    if (loading) expect(loading).toBeInTheDocument()
    await screen.findByText('Salary Summary')

    return result
  }

  const addSalaryAdjustment = async ({
    date = '2026-05-15',
    description = 'Phone allowance',
    amount = '120',
  } = {}) => {
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salary Adjustment' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: date } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: description } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  }

  beforeEach(() => {
    window.localStorage.clear()
    profile = defaultProfile()
    records = []
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (String(url).includes('hr/salary/profile')) return { profile }
      if (String(url).includes('hr/salary/applications')) {
        const body = options.body
        const claims = JSON.parse(body.get('claims') || '[]')
        const deductions = JSON.parse(body.get('deductions') || '{}')
        const record = {
          id: 1,
          salaryMonth: 'May 2026',
          salaryMonthValue: body.get('salary_month'),
          basicSalary: Number(body.get('basic_salary')),
          claimsTotal: Number(body.get('claims_total')),
          medicalClaimsTotal: 0,
          employeeDeductions: Number(body.get('employee_deductions')),
          employerContributions: Number(body.get('employer_contributions')),
          payableSalary: Number(body.get('payable_salary')),
          status: 'Submitted',
          claims: claims.map((claim) => ({ ...claim, attachment: null })),
          deductions,
        }
        records = [record]
        return { record }
      }
      if (String(url).includes('hr/salary/records')) return { records }
      return {}
    })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads the default salary summary without editable salary setup fields', async () => {
    await renderApplySalary()

    expect(screen.queryByLabelText('Salary Month')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Basic Salary')).not.toBeInTheDocument()
    expect(screen.getAllByText('Salary Period').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 3000.00').length).toBeGreaterThan(0)
  })

  it('shows only salary adjustment as the salary claim entry type', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))

    expect(screen.getByRole('heading', { name: 'Adjustment Type' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salary Adjustment' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Expense' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mileage' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Medical' })).not.toBeInTheDocument()
  })

  it('adds and edits a payroll adjustment row', async () => {
    await renderApplySalary()

    await addSalaryAdjustment()

    expect(screen.getAllByText(/Phone allowance/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 120.00').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Phone allowance' })[0])
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Updated allowance' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getAllByText(/Updated allowance/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Phone allowance')).not.toBeInTheDocument()
    expect(screen.getAllByText('RM 150.00').length).toBeGreaterThan(0)
  })

  it('submits only allowance claims for salary applications', async () => {
    const salaryMonth = new Date().toLocaleDateString('en-CA').slice(0, 7)
    await renderApplySalary()

    await addSalaryAdjustment({
      date: `${salaryMonth}-15`,
      description: 'Payroll correction',
      amount: '50',
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form'))

    await screen.findByText(/Salary application was submitted/)
    const [, options] = apiMock.apiJson.mock.calls.find(
      ([url, callOptions]) =>
        String(url).includes('hr/salary/applications') &&
        callOptions?.method === 'POST' &&
        callOptions?.body instanceof FormData,
    )
    const submittedClaims = JSON.parse(options.body.get('claims'))

    expect(submittedClaims).toEqual([
      expect.objectContaining({
        type: 'Allowance',
        description: 'Payroll correction',
        attachmentId: null,
      }),
    ])
    expect(options.body.get('attachments[claim-1]')).toBeNull()

    const savedRecord = (await getSalaryRecords()).find(
      (record) => record.salaryMonthValue === salaryMonth,
    )
    expect(savedRecord).toEqual(expect.objectContaining({ claimsTotal: 50, status: 'Submitted' }))
    expect(savedRecord.claims[0]).toEqual(
      expect.objectContaining({ type: 'Allowance', description: 'Payroll correction' }),
    )
  })

  it('ignores legacy reimbursement rows when editing a salary record', async () => {
    await renderApplySalary(
      <ApplySalary
        editRecord={{
          id: 10,
          salaryMonth: 'December 2099',
          salaryMonthValue: '2099-12',
          basicSalary: 3000,
          claims: [
            {
              id: 99,
              type: 'Expense',
              date: '2099-12-15',
              description: 'Parking claim',
              amount: 50,
            },
            {
              id: 100,
              type: 'Allowance',
              date: '2099-12-16',
              description: 'Payroll adjustment',
              amount: 80,
            },
          ],
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Salary Adjustment' })).toBeInTheDocument()
    expect(screen.getAllByText(/Payroll adjustment/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Parking claim/)).not.toBeInTheDocument()
  })

  it('shows submission success and invokes the records callback', async () => {
    const onViewRecords = vi.fn()
    await renderApplySalary(<ApplySalary onViewRecords={onViewRecords} />)

    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form'))

    await screen.findByText(/Salary application was submitted/)
    fireEvent.click(screen.getByRole('button', { name: 'View Records' }))

    await waitFor(() => {
      expect(onViewRecords).toHaveBeenCalledTimes(1)
    })
  })
})
