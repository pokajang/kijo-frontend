import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getQuotationPdfFilename,
  loadQuotationPdf,
  sanitizeQuotationPdfFilename,
} from './quotationPdfService'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))

vi.mock('../../../../api/apiClient', () => ({ apiFetch: mocks.apiFetch }))

const pdfBlob = (signature = '%PDF-1.7') => ({
  type: 'application/pdf',
  slice: () => ({ text: () => Promise.resolve(signature) }),
})

const response = ({
  ok = true,
  status = 200,
  contentType = 'application/pdf',
  disposition = 'inline; filename="QTR26-001_Client_A.pdf"',
  payload = {},
  blob = pdfBlob(),
} = {}) => ({
  ok,
  status,
  headers: new Headers({
    'content-type': contentType,
    'content-disposition': disposition,
  }),
  blob: () => Promise.resolve(blob),
  clone: () => ({ json: () => Promise.resolve(payload) }),
})

describe('quotationPdfService', () => {
  beforeEach(() => mocks.apiFetch.mockReset())

  it('loads a valid PDF once and preserves the API filename', async () => {
    mocks.apiFetch.mockResolvedValue(response())

    const result = await loadQuotationPdf({
      url: '/api/quote-records/training/68/pdf',
      record: { id: 68 },
    })

    expect(mocks.apiFetch).toHaveBeenCalledTimes(1)
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      '/api/quote-records/training/68/pdf',
      expect.objectContaining({
        credentials: 'include',
        headers: { Accept: 'application/pdf' },
        silentError: true,
      }),
    )
    expect(result.filename).toBe('QTR26-001_Client_A.pdf')
  })

  it('prefers and decodes an RFC extended filename', () => {
    expect(
      getQuotationPdfFilename(
        "inline; filename=legacy.pdf; filename*=UTF-8''QTR26-001_Client%20%C3%84.pdf",
      ),
    ).toBe('QTR26-001_Client Ä.pdf')
  })

  it('builds a deterministic record fallback when the header is missing', () => {
    expect(
      getQuotationPdfFilename('', {
        id: 68,
        quotationId: 'QTR26-0068',
        clientDetails: { companyName: 'Client A' },
      }),
    ).toBe('QTR26-0068_Client A.pdf')
  })

  it('sanitizes unsafe and excessively long filenames while preserving the extension', () => {
    expect(sanitizeQuotationPdfFilename('../QTR:26\\Client?.pdf')).toBe('_QTR_26_Client_.pdf')
    expect(sanitizeQuotationPdfFilename(`${'a'.repeat(250)}.pdf`)).toMatch(/^a{176}\.pdf$/)
  })

  it('rejects a response that is not a valid PDF', async () => {
    mocks.apiFetch.mockResolvedValue(response({ blob: pdfBlob('not-a-pdf') }))

    await expect(
      loadQuotationPdf({ url: '/api/quote-records/training/68/pdf', record: { id: 68 } }),
    ).rejects.toThrow('not a valid PDF')
  })

  it('preserves workflow error details for approval refresh and user feedback', async () => {
    mocks.apiFetch.mockResolvedValue(
      response({
        ok: false,
        status: 409,
        contentType: 'application/json',
        payload: {
          message: 'BD approval is pending.',
          approval: { id: 91, can_issue: false },
        },
      }),
    )

    await expect(
      loadQuotationPdf({ url: '/api/quote-records/equipment/68/pdf', record: { id: 68 } }),
    ).rejects.toMatchObject({
      message: 'BD approval is pending.',
      status: 409,
      data: { approval: { id: 91, can_issue: false } },
    })
  })
})
