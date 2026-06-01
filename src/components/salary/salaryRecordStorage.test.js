import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportSalaryClaimsPdf,
  findSalaryRecord,
  getSalaryRecords,
  removeSalaryRecord,
  saveSalaryRecord,
} from './salaryRecordStorage'

const apiMock = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: apiMock.apiFetch,
  apiJson: apiMock.apiJson,
}))

describe('salaryRecordStorage API adapter', () => {
  beforeEach(() => {
    apiMock.apiFetch.mockReset()
    apiMock.apiJson.mockReset()
  })

  it('loads salary records from the API', async () => {
    apiMock.apiJson.mockResolvedValueOnce({
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
    })

    await expect(getSalaryRecords()).resolves.toEqual([
      expect.objectContaining({ id: 10, salaryMonth: 'June 2026', claimsTotal: 75 }),
    ])
  })

  it('finds a salary record through the API', async () => {
    apiMock.apiJson.mockResolvedValueOnce({
      record: {
        id: 10,
        salaryMonth: 'June 2026',
        salaryMonthValue: '2026-06',
        basicSalary: 3200,
        claimsTotal: 75,
        employeeDeductions: 374.05,
        payableSalary: 2900.95,
        status: 'Submitted',
        claims: [{ id: 1, type: 'Expense', description: 'Parking', amount: 75 }],
      },
    })

    await expect(findSalaryRecord(10)).resolves.toEqual(
      expect.objectContaining({
        id: 10,
        claims: [expect.objectContaining({ description: 'Parking' })],
      }),
    )
    expect(apiMock.apiJson).toHaveBeenCalledWith(expect.stringContaining('hr/salary/records/10'), {
      silentError: true,
    })
  })

  it('maps missing salary records to null without surfacing API noise', async () => {
    const error = new Error('Not found')
    error.notFound = true
    error.status = 404
    apiMock.apiJson.mockRejectedValueOnce(error)

    await expect(findSalaryRecord(10)).resolves.toBeNull()
    expect(apiMock.apiJson).toHaveBeenCalledWith(expect.stringContaining('hr/salary/records/10'), {
      silentError: true,
    })
  })

  it('submits salary records as multipart form data with attachment files', async () => {
    apiMock.apiJson.mockResolvedValueOnce({
      record: {
        id: 10,
        salaryMonth: 'June 2026',
        salaryMonthValue: '2026-06',
        basicSalary: 3200,
        claimsTotal: 75,
        employeeDeductions: 374.05,
        payableSalary: 2900.95,
        status: 'Submitted',
        claims: [],
      },
    })

    const file = new File(['receipt'], 'parking.pdf', { type: 'application/pdf' })
    const saved = await saveSalaryRecord({
      salaryMonthValue: '2026-06',
      basicSalary: 3200,
      claimsTotal: 75,
      employeeDeductions: 374.05,
      payableSalary: 2900.95,
      claims: [
        {
          id: 'claim-1',
          type: 'Expense',
          description: 'Parking',
          amount: 75,
          attachment: { file, name: 'parking.pdf' },
        },
      ],
      deductions: { employeeTotal: 374.05, employerTotal: 485.55 },
    })

    const [, options] = apiMock.apiJson.mock.calls[0]
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('salary_month')).toBe('2026-06')
    expect(JSON.parse(options.body.get('claims'))[0].attachmentId).toBeNull()
    expect(options.body.get('attachments[claim-1]')).toEqual(
      expect.objectContaining({ name: 'parking.pdf', type: 'application/pdf' }),
    )
    expect(saved.id).toBe(10)
  })

  it('deletes salary records through the API', async () => {
    apiMock.apiJson.mockResolvedValueOnce({ status: 'success' })

    await removeSalaryRecord(10)

    expect(apiMock.apiJson).toHaveBeenCalledWith(expect.stringContaining('hr/salary/records/10'), {
      method: 'DELETE',
    })
  })

  it('exports salary claims through the PDF API', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    apiMock.apiFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'inline; filename="salary-claims-june-2026.pdf"' },
      blob: async () => blob,
    })

    await expect(exportSalaryClaimsPdf(10)).resolves.toEqual({
      blob,
      filename: 'salary-claims-june-2026.pdf',
    })

    expect(apiMock.apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('hr/salary/records/10/claims-pdf'),
    )
  })
})
