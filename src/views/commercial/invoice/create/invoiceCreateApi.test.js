import { afterEach, describe, expect, it, vi } from 'vitest'

import { submitInvoicePayload } from './invoiceCreateApi'

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

describe('invoiceCreateApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps backend project_closed response to projectClosed', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: 'success',
            invoice_id: 12,
            invoice_ref_no: 'INV-12',
            project_closed: true,
          }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitInvoicePayload({ project_id: 44 })).resolves.toEqual({
      success: true,
      invoiceId: 12,
      invoiceRefNo: 'INV-12',
      projectClosed: true,
    })
  })

  it('defaults projectClosed to false when backend omits project_closed', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: 'success',
            invoice_id: 13,
            invoice_ref_no: 'INV-13',
          }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitInvoicePayload({ project_id: 44 })).resolves.toEqual({
      success: true,
      invoiceId: 13,
      invoiceRefNo: 'INV-13',
      projectClosed: false,
    })
  })
})
