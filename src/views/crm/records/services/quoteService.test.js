import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchIHQuotes } from './quoteService'

describe('quoteService IH records', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps Industrial Hygiene additional fee rows into record form data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: [
              {
                id: 7,
                quote_ref_no: 'QIH26-0001AZA',
                client_name: 'Client A',
                grand_total: 500,
                hygiene_items: [
                  {
                    id: 1,
                    item_description: 'Sample analysis',
                    description: 'Lab analysis',
                    quantity: '2',
                    unit: 'sample',
                    unit_price: '120',
                    line_total: '240',
                  },
                ],
              },
            ],
          }),
      }),
    )

    const rows = await fetchIHQuotes()

    expect(rows).toHaveLength(1)
    expect(rows[0].formData.hygieneItems[0]).toMatchObject({
      item_description: 'Sample analysis',
      description: 'Lab analysis',
      quantity: 2,
      unit: 'sample',
      unit_price: 120,
      line_total: 240,
    })
    expect(rows[0].lineItems[0].itemName).toBe('Sample analysis')
  })
})
