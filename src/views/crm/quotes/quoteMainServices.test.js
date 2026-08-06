import { describe, expect, it } from 'vitest'

import { serviceConfig } from './quoteMainServices'

describe('equipment quote edit mapping', () => {
  it('hydrates quotation and item remarks without changing pricing fields', () => {
    const mapped = serviceConfig.equipment.mapRowToFormData({
      quotation_remarks: 'Deliver all equipment together.',
      items: [
        {
          item_id: 701,
          item_name: 'Gas detector',
          item_remarks: 'Colour: navy blue',
          quantity: 2,
          unit_price: 100,
          marked_up_price: 150,
          line_total: 300,
        },
      ],
      grand_total: 300,
    })

    expect(mapped.quotationRemarks).toBe('Deliver all equipment together.')
    expect(mapped.items[0]).toMatchObject({
      item_id: 701,
      item_remarks: 'Colour: navy blue',
      quantity: 2,
      marked_up_price: 150,
      line_total: 300,
    })
    expect(mapped.grandTotal).toBe(300)
  })
})
