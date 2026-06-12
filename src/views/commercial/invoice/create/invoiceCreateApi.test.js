import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { submitInvoicePayload, useHygieneQuoteData } from './invoiceCreateApi'

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

  it('hydrates Industrial Hygiene quote additional fees into pricing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              sub_total: '1240',
              discount: '0',
              sst_percent: '8',
              sst_amount: '99.20',
              grand_total: '1339.20',
              hygiene_items: [
                {
                  id: 1,
                  item_description: 'Sample analysis',
                  description: 'Lab analysis',
                  quantity: '2',
                  unit: 'sample',
                  unit_price: '120',
                },
              ],
            },
          }),
      }),
    )
    const setQuoteDetails = vi.fn()
    const setPricing = vi.fn()

    useHygieneQuoteData(9, setQuoteDetails, setPricing)

    await waitFor(() => expect(setPricing).toHaveBeenCalledTimes(1))
    const nextPricing = setPricing.mock.calls[0][0]({})

    expect(setQuoteDetails).toHaveBeenCalledWith(
      expect.objectContaining({ grand_total: '1339.20' }),
    )
    expect(nextPricing.hygiene_items[0]).toMatchObject({
      item_description: 'Sample analysis',
      description: 'Lab analysis',
      quantity: 2,
      unit: 'sample',
      unit_price: 120,
    })
  })
})
