import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ApplySalary from './ApplySalary'
import { saveSalaryProfile } from './salaryProfileStorage'
import { getSalaryRecords } from './salaryRecordStorage'

const attachmentMocks = vi.hoisted(() => ({
  prepareSalaryAttachment: vi.fn(),
}))

const apiMock = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))

vi.mock('./attachmentUtils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    prepareSalaryAttachment: attachmentMocks.prepareSalaryAttachment,
  }
})

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

  const renderApplySalary = async (ui = <ApplySalaryHarness />) => {
    const result = render(ui)

    expect(screen.getByText('Loading salary settings...')).toBeInTheDocument()
    expect(screen.queryByText('RM 3000.00')).not.toBeInTheDocument()
    await screen.findByText('Salary Summary')

    return result
  }

  const expectTextPresent = (matcher) => {
    expect(screen.getAllByText(matcher).length).toBeGreaterThan(0)
  }

  const findTextPresent = async (matcher) => {
    expect((await screen.findAllByText(matcher)).length).toBeGreaterThan(0)
  }

  beforeEach(() => {
    window.localStorage.clear()
    profile = defaultProfile()
    records = []
    apiMock.apiJson.mockImplementation(async (url, options = {}) => {
      if (String(url).includes('hr/salary/profile') && options.method === 'PUT') {
        const body = JSON.parse(options.body)
        profile = {
          basicSalary: String(body.basic_salary),
          effectiveMonth: body.effective_month,
          defaultMileageRate: String(body.default_mileage_rate),
          yearlyMedicalClaim: String(body.yearly_medical_claim ?? profile.yearlyMedicalClaim),
          notes: body.notes || '',
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
          medicalClaimsTotal: claims
            .filter((claim) => claim.type === 'Medical')
            .reduce((total, claim) => total + Number(claim.amount || 0), 0),
          employeeDeductions: Number(body.get('employee_deductions')),
          employerContributions: Number(body.get('employer_contributions')),
          payableSalary: Number(body.get('payable_salary')),
          status: 'Submitted',
          claims: claims.map((claim) => {
            const file = body.get(`attachments[${claim.id}]`)
            return {
              ...claim,
              attachment:
                file instanceof File
                  ? {
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      url: `/hr/salary/attachments/${claim.id}`,
                    }
                  : null,
            }
          }),
          deductions,
        }
        records = [record]
        return { record }
      }
      if (String(url).includes('hr/salary/records')) return { records }
      return {}
    })
    attachmentMocks.prepareSalaryAttachment.mockImplementation(async (file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: 'data:application/pdf;base64,cmVjZWlwdA==',
      originalName: file.name,
      originalSize: file.size,
      compressed: false,
    }))
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads the default salary without editable salary setup fields', async () => {
    await renderApplySalary()

    expect(screen.queryByLabelText('Salary Month')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Basic Salary')).not.toBeInTheDocument()
    expect(screen.getAllByText('Salary Period').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Adjustments' })).not.toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    expect(screen.queryByText('Submitted')).not.toBeInTheDocument()
    expect(screen.queryByText('Paid')).not.toBeInTheDocument()
    expectTextPresent('RM 3000.00')
  })

  it('loads fixed salary and recurring allowances from salary settings', async () => {
    await saveSalaryProfile({
      basicSalary: '4500',
      effectiveMonth: '2026-05',
      defaultMileageRate: '0.60',
      notes: '',
      recurringAllowances: [
        {
          id: 'phone',
          description: 'Phone allowance',
          amount: '150',
          startMonth: '',
          endMonth: '',
          active: true,
        },
      ],
    })

    await renderApplySalary()

    await findTextPresent('RM 4500.00')
    expect(screen.queryByLabelText('Salary Month')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Basic Salary')).not.toBeInTheDocument()
    expect(screen.getAllByText('RM 150.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Phone allowance/).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('heading', { name: 'Fixed Monthly Additions' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Loaded from Salary Settings.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Fixed monthly/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Phone allowance' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Phone allowance' })).not.toBeInTheDocument()
  })

  it('asks for an adjustment type before showing the matching input panel', async () => {
    await renderApplySalary()

    expect(screen.getByRole('button', { name: 'Add Adjustment' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Non-Recurring Allowance' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expense' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mileage' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Medical' })).not.toBeInTheDocument()
    expect(screen.queryByText('Manual Adjustments')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))

    expect(screen.getByRole('heading', { name: 'Adjustment Type' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non-Recurring Allowance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expense' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mileage' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Medical' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Non-Recurring Allowance' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expense' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mileage' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Medical' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Non-Recurring Allowance' }))

    expect(screen.getByRole('heading', { name: 'Non-Recurring Allowance' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expense' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mileage' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Medical' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Medical' }))

    expect(
      screen.queryByRole('heading', { name: 'Non-Recurring Allowance' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expense' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mileage' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Medical' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mileage' }))

    expect(screen.queryByRole('heading', { name: 'Medical' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mileage' })).toBeInTheDocument()
  })

  it('updates review totals when claim items are added', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Non-Recurring Allowance' }))
    fireEvent.change(screen.getAllByLabelText('Date')[0], { target: { value: '2026-05-15' } })
    fireEvent.change(screen.getAllByLabelText('Description')[0], {
      target: { value: 'Phone allowance' },
    })
    fireEvent.change(screen.getAllByLabelText('Amount')[0], { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getAllByText('RM 120.00').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Edit Phone allowance' }).length).toBeGreaterThan(
      0,
    )
    expectTextPresent('RM 2,769.35'.replace(',', ''))
  })

  it('adds medical claims as manual adjustments', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Medical' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-18' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Clinic claim' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'clinic.pdf', { type: 'application/pdf' })] },
    })
    await screen.findByText(/clinic.pdf/)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expectTextPresent(/Clinic claim/)
    expect(screen.getAllByRole('button', { name: 'Edit Clinic claim' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 90.00').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        /Annual medical balance: current RM 1200.00 \| after this claim RM 1110.00/,
      )[0],
    ).toBeInTheDocument()
    expectTextPresent('RM 2739.35')
  })

  it('edits an allowance row without creating a duplicate', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Non-Recurring Allowance' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-15' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Phone allowance' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Phone allowance' })[0])
    expect(screen.getByLabelText('Description')).toHaveValue('Phone allowance')
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Updated allowance' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expectTextPresent(/Updated allowance/)
    expect(screen.queryByText('Phone allowance')).not.toBeInTheDocument()
    expect(screen.getAllByText('RM 150.00').length).toBeGreaterThan(0)
  })

  it('cancels edit and leaves the original expense row unchanged', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-15' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Parking claim' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'parking.pdf', { type: 'application/pdf' })] },
    })
    await screen.findByText(/parking.pdf/)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Parking claim' })[0])
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Changed claim' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1))

    expectTextPresent(/Parking claim/)
    expect(screen.queryByText('Changed claim')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('edits mileage rows and recalculates the row amount', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mileage' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-15' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Office' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Client site' } })
    fireEvent.change(screen.getByLabelText('KM (one-way)'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Office to Client site' })[0])
    expect(screen.getByLabelText('From')).toHaveValue('Office')
    expect(screen.getByLabelText('To')).toHaveValue('Client site')
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Warehouse' } })
    fireEvent.change(screen.getByLabelText('KM (one-way)'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expectTextPresent(/Office to Warehouse/)
    expect(screen.queryByText('Office to Client site')).not.toBeInTheDocument()
    expect(screen.getAllByText('RM 24.00').length).toBeGreaterThan(0)
  })

  it('shows attachment metadata after selecting a valid file', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })] },
    })

    await findTextPresent(/receipt.pdf/)
  })

  it('disables add while an attachment is being prepared', async () => {
    let resolveAttachment
    attachmentMocks.prepareSalaryAttachment.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAttachment = resolve
      }),
    )

    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })] },
    })

    expect(await screen.findByRole('button', { name: 'Preparing' })).toBeDisabled()

    resolveAttachment({
      file: new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' }),
      name: 'receipt.jpg',
      size: 7,
      type: 'image/jpeg',
      dataUrl: 'data:image/jpeg;base64,cmVjZWlwdA==',
      originalName: 'receipt.jpg',
      originalSize: 7,
      compressed: false,
    })

    await findTextPresent(/receipt.jpg/)
  })

  it('opens claim row attachments in a preview modal', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })] },
    })
    await findTextPresent(/receipt.pdf/)

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-15' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Parking receipt' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Open receipt.pdf' })[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTitle('receipt.pdf')).toHaveAttribute(
      'src',
      'data:application/pdf;base64,cmVjZWlwdA==',
    )
    expect(screen.queryByRole('button', { name: 'Download receipt.pdf' })).not.toBeInTheDocument()
  })

  it('preserves attachment metadata while editing unless replaced', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })] },
    })
    await findTextPresent(/receipt.pdf/)
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-15' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Parking receipt' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Parking receipt' })[0])
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expectTextPresent(/receipt.pdf/)

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Parking receipt' })[0])
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['new'], 'replacement.pdf', { type: 'application/pdf' })] },
    })
    await findTextPresent(/replacement.pdf/)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expectTextPresent(/replacement.pdf/)
    expect(screen.queryByText(/receipt.pdf/)).not.toBeInTheDocument()
  })

  it('shows validation for invalid attachment types', async () => {
    attachmentMocks.prepareSalaryAttachment.mockRejectedValueOnce(
      new Error('Upload a PDF, JPG, JPEG, or PNG file.'),
    )

    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['data'], 'receipt.txt', { type: 'text/plain' })] },
    })

    expect(await screen.findByText('Upload a PDF, JPG, JPEG, or PNG file.')).toBeInTheDocument()
  })

  it('cancels the current adjustment draft and returns to the panel add state', async () => {
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Non-Recurring Allowance' }))
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Temporary allowance' },
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1))

    expect(screen.queryByRole('button', { name: 'Add Adjustment' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Adjustment Type' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Non-Recurring Allowance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByLabelText('Description')).toHaveValue('')
  })

  it('shows submission success and invokes the records callback', async () => {
    const onViewRecords = vi.fn()
    await renderApplySalary(<ApplySalary onViewRecords={onViewRecords} />)

    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form'))

    await findTextPresent(/Salary application was submitted/)

    fireEvent.click(screen.getByRole('button', { name: 'View Records' }))

    await waitFor(() => {
      expect(onViewRecords).toHaveBeenCalledTimes(1)
    })
  })

  it('persists submitted salary applications into salary records', async () => {
    const salaryMonth = new Date().toLocaleDateString('en-CA').slice(0, 7)
    await renderApplySalary()

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }))
    fireEvent.change(screen.getByLabelText('Choose File'), {
      target: { files: [new File(['receipt'], 'parking.pdf', { type: 'application/pdf' })] },
    })
    await findTextPresent(/parking.pdf/)
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: `${salaryMonth}-15` } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Parking claim' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form'))

    await findTextPresent(/Salary application was submitted/)

    const savedRecord = (await getSalaryRecords()).find(
      (record) => record.salaryMonthValue === salaryMonth,
    )
    expect(savedRecord).toEqual(
      expect.objectContaining({
        status: 'Submitted',
        claimsTotal: 50,
      }),
    )
    expect(savedRecord.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'Expense',
          description: 'Parking claim',
          amount: 50,
          attachment: expect.objectContaining({
            name: 'parking.pdf',
            url: expect.stringContaining('/hr/salary/attachments/'),
          }),
        }),
      ]),
    )
    expect(savedRecord.deductions).toEqual(expect.objectContaining({ employeeTotal: 350.65 }))
  })

  it('shows existing claim rows immediately when editing a salary record', async () => {
    render(
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
              attachment: {
                id: 7,
                name: 'parking.pdf',
                size: 1000,
                type: 'application/pdf',
                url: '/hr/salary/attachments/7',
              },
            },
          ],
        }}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Expense' })).toBeInTheDocument()
    expectTextPresent(/Parking claim/)
    expectTextPresent(/parking.pdf/)
  })
})
