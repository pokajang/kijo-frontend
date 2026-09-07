import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportSalaryClaimsPdf,
  findSalaryRecord,
  getSalaryRecords,
  removeSalaryRecord,
  saveSalaryApplicationDraft,
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

  it('preserves every historical salary claim row and its stored total', async () => {
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
        claims: [
          { id: 1, type: 'Expense', description: 'Parking', amount: 75 },
          { id: 2, type: 'Allowance', description: 'Payroll adjustment', amount: 25 },
        ],
      },
    })

    await expect(findSalaryRecord(10)).resolves.toEqual(
      expect.objectContaining({
        id: 10,
        claimsTotal: 75,
        claims: [
          expect.objectContaining({ description: 'Parking' }),
          expect.objectContaining({ description: 'Payroll adjustment' }),
        ],
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

  it('submits salary records as payroll-only multipart form data', async () => {
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

    const saved = await saveSalaryRecord({
      salaryMonthValue: '2026-06',
      basicSalary: 3200,
      claimsTotal: 75,
      employeeDeductions: 374.05,
      payableSalary: 2900.95,
      claims: [
        {
          id: 'claim-allowance',
          type: 'Allowance',
          description: 'Payroll adjustment',
          amount: 75,
          attachment: {
            file: new File(['adjustment evidence'], 'adjustment.pdf', {
              type: 'application/pdf',
            }),
            name: 'adjustment.pdf',
          },
        },
        {
          id: 'claim-1',
          type: 'Expense',
          description: 'Parking',
          amount: 75,
          attachment: {
            file: new File(['receipt'], 'parking.pdf', { type: 'application/pdf' }),
            name: 'parking.pdf',
          },
        },
      ],
      deductions: { employeeTotal: 374.05, employerTotal: 485.55 },
    })

    const [, options] = apiMock.apiJson.mock.calls[0]
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('salary_month')).toBe('2026-06')
    expect(JSON.parse(options.body.get('claims'))).toEqual([
      expect.objectContaining({
        id: 'claim-allowance',
        type: 'Allowance',
        attachmentId: null,
      }),
    ])
    expect(options.body.get('attachments[claim-allowance]')).toBeInstanceOf(File)
    expect(saved.id).toBe(10)
  })

  it('saves multipart salary drafts through POST method override without embedded files', async () => {
    apiMock.apiJson.mockResolvedValueOnce({
      record: {
        id: 11,
        salaryMonth: 'June 2026',
        salaryMonthValue: '2026-06',
        basicSalary: 3200,
        status: 'Draft',
        claims: [],
      },
    })

    const attachment = {
      name: 'legacy.pdf',
      type: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,bGVnYWN5',
      file: new File(['legacy'], 'legacy.pdf', { type: 'application/pdf' }),
    }
    await saveSalaryApplicationDraft({
      salaryMonthValue: '2026-06',
      basicSalary: 3200,
      claims: [
        {
          id: 'claim-allowance',
          type: 'Allowance',
          date: '2026-06-10',
          description: 'Payroll adjustment',
          amount: 75,
        },
      ],
      draftPayload: {
        formData: { salaryMonth: '2026-06', allowanceAttachment: attachment },
        allowanceItems: [],
      },
    })

    const [, options] = apiMock.apiJson.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('_method')).toBe('PUT')
    expect(options.body.get('salary_month')).toBe('2026-06')
    expect(JSON.parse(options.body.get('draft_payload')).formData.allowanceAttachment).toBeNull()
  })

  it('deletes salary records through the API', async () => {
    apiMock.apiJson.mockResolvedValueOnce({ status: 'success' })

    await removeSalaryRecord({ id: 10, recordVersion: 3 })

    expect(apiMock.apiJson).toHaveBeenCalledWith(expect.stringContaining('hr/salary/records/10'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE', record_version: 3, reason: '' }),
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
