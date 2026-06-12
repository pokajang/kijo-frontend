import { describe, expect, it } from 'vitest'

import {
  buildDeliveryOrderCreatePayload,
  shouldIncludeInvoiceItem,
} from './deliveryOrderCreatePayload'

describe('deliveryOrderCreatePayload', () => {
  it('keeps additional fee rows while excluding accounting-only rows', () => {
    expect(shouldIncludeInvoiceItem({ item_description: 'Sample analysis' })).toBe(true)
    expect(shouldIncludeInvoiceItem({ item_description: 'Professional fee' })).toBe(true)
    expect(shouldIncludeInvoiceItem({ item_description: 'Discount' })).toBe(false)
    expect(shouldIncludeInvoiceItem({ item_description: '8% SST' })).toBe(false)
    expect(shouldIncludeInvoiceItem({ item_description: 'HRD Claim' })).toBe(false)
  })

  it('uses item name as delivery order description when notes are blank', () => {
    const payload = buildDeliveryOrderCreatePayload({
      clientDetails: {
        name: 'Client A',
        address: '1 Test Road',
        contact: { name: 'PIC A', position: 'Manager', email: 'pic@example.test', phone: '123' },
      },
      companyDetails: {
        contact: { name: 'Admin', email: 'admin@example.test', phone: '456' },
      },
      projectDetails: {
        project_id: 1,
        name: 'Project A',
        code: 'P-001',
        date: '2026-06-12',
        type: 'Industrial Hygiene',
        description: '',
        servicePeriod: 'Not Available',
      },
      items: [{ name: 'Sample analysis', description: '', quantity: 1, unit: 'sample' }],
    })

    expect(payload.breakdown[0].description).toBe('Sample analysis')
  })
})
