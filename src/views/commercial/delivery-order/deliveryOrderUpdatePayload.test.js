import { describe, expect, it } from 'vitest'

import {
  buildDeliveryOrderUpdatePayload,
  resolveDeliveryOrderProjectId,
} from './deliveryOrderUpdatePayload'

const updatedDeliveryOrder = {
  do_id: 77,
  do_number: 'DO26-001ABC',
  client_name: 'Client A',
  client_address: 'Address A',
  client_contact_name: 'PIC A',
  client_contact_position: 'Manager',
  client_contact_email: 'pic@example.com',
  client_contact_phone: '0123456789',
  company_contact_name: 'Issuer A',
  company_contact_email: 'issuer@example.com',
  company_contact_phone: '0399999999',
  project_name: 'Project A',
  project_code: 'P001',
  project_award_date: '2026-06-01',
  project_type: 'Special',
  project_description: 'Scope A',
  project_service_period: 'June 2026',
  breakdown: [
    {
      item_name: 'Site work',
      description: 'Manual work',
      quantity: 1,
      unit: 'Lot',
    },
  ],
}

describe('deliveryOrderUpdatePayload', () => {
  it('uses project_id from updated data when present', () => {
    const payload = buildDeliveryOrderUpdatePayload({
      ...updatedDeliveryOrder,
      project_id: 123,
    })

    expect(payload.details.project_id).toBe(123)
    expect(payload.breakdown).toEqual([
      {
        item_name: 'Site work',
        description: 'Manual work',
        quantity: 1,
        unit: 'Lot',
      },
    ])
    expect(payload.items).toEqual(payload.breakdown)
  })

  it('falls back to the current record project_id for detail and list edit saves', () => {
    const payload = buildDeliveryOrderUpdatePayload(updatedDeliveryOrder, {
      project_id: 456,
    })

    expect(payload.details.project_id).toBe(456)
  })

  it('supports camelCase projectId from older normalized records', () => {
    expect(resolveDeliveryOrderProjectId({}, { projectId: 789 })).toBe(789)
  })

  it('omits project_id when unresolved so the backend preserves the existing link', () => {
    const payload = buildDeliveryOrderUpdatePayload(updatedDeliveryOrder)

    expect(payload.details).not.toHaveProperty('project_id')
  })
})
