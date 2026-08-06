import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchEquipmentQuotes,
  fetchIHQuotes,
  fetchManpowerQuotes,
  fetchSpecialQuotes,
} from './quoteService'

const mockResponse = (row) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: [row] }),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('quotation record detail parity mapping', () => {
  it('preserves Hygiene governance, pricing, totals, and additional fees', async () => {
    mockResponse({
      id: 1,
      pricing_rule_version: 'ih_complexity_v1',
      complexity_rating: '3',
      traffic_light_rule_version: 'v1',
      estimated_total_cost: '1000',
      unit_price: '500',
      travel_charge: '100',
      discount: '0',
      sst_percent: '8',
      sst_amount: '80',
      sub_total: '1000',
      grand_total: '1080',
      hygiene_items: [
        {
          id: 2,
          item_description: 'Lab fee',
          quantity: '1.5',
          unit: 'lot',
          unit_price: '200',
          line_total: '300',
        },
      ],
    })

    const [record] = await fetchIHQuotes()

    expect(record.formData).toMatchObject({
      pricingRuleVersion: 'ih_complexity_v1',
      complexityRating: 3,
      trafficLightRuleVersion: 'v1',
      estimatedTotalCost: 1000,
      discount: 0,
      sstAmount: 80,
      subTotal: 1000,
      grandTotal: 1080,
    })
    expect(record.lineItems[0].quantity).toBe(1.5)
    expect(record.grandTotal).toBe(1080)
  })

  it('preserves Manpower billing, approval, estimate, and totals', async () => {
    mockResponse({
      id: 2,
      billing_unit: 'hour',
      duration_hours: '12.5',
      duration_months: '0',
      no_of_pax: '2',
      requires_management_approval: 1,
      traffic_light_rule_version: 'v2',
      estimated_total_cost: '4000',
      unit_cost: '200',
      discount: '0',
      sst_percent: '0',
      sst_amount: '0',
      sub_total: '5000',
      grand_total: '5000',
    })

    const [record] = await fetchManpowerQuotes()

    expect(record.formData).toMatchObject({
      billingUnit: 'hour',
      durationHours: 12.5,
      durationMonths: 0,
      noOfPax: 2,
      requiresManagementApproval: true,
      trafficLightRuleVersion: 'v2',
      estimatedTotalCost: 4000,
    })
    expect(record.sstAmount).toBe(0)
    expect(record.grandTotal).toBe(5000)
  })

  it('preserves Special decimal quantities, discount, SST, and totals', async () => {
    mockResponse({
      id: 3,
      discount: '50',
      sst_percent: '8',
      sst_amount: '40',
      sub_total: '500',
      grand_total: '540',
      line_items: [
        {
          id: 4,
          line_item_title: 'Audit day',
          quantity: '1.5',
          unit: 'Day',
          unit_price: '300',
          line_total: '450',
        },
      ],
    })

    const [record] = await fetchSpecialQuotes()

    expect(record.lineItems[0].quantity).toBe(1.5)
    expect(record.formData).toMatchObject({
      discount: 50,
      sstPercent: 8,
      subTotal: 500,
      sstAmount: 40,
      grandTotal: 540,
    })
    expect(record.discountAmount).toBe(50)
  })

  it('keeps Equipment saved base and quoted prices distinct', async () => {
    mockResponse({
      id: 4,
      estimated_total_cost: '1000',
      traffic_light_rule_version: 'v1',
      quotation_remarks: 'Deliver all equipment together.',
      delivery_charge: '100',
      misc_charge: '25',
      discount: '50',
      sst_percent: '8',
      sst_amount: '102',
      sub_total: '1275',
      grand_total: '1377',
      line_items: [
        {
          id: 5,
          item_id: 6,
          item_name: 'Gas Detector',
          item_remarks: 'Colour: navy blue',
          supplier_name: 'Supplier A',
          supplier_price: '400',
          price_date: '2026-07-01',
          quantity: '2',
          unit_price: '400',
          marked_up_price: '600',
          line_total: '1200',
        },
      ],
    })

    const [record] = await fetchEquipmentQuotes()

    expect(record.formData).toMatchObject({
      estimatedTotalCost: 1000,
      trafficLightRuleVersion: 'v1',
      quotationRemarks: 'Deliver all equipment together.',
    })
    expect(record.lineItems[0]).toMatchObject({
      supplierName: 'Supplier A',
      supplierPrice: 400,
      quantity: 2,
      unitPrice: 400,
      markedUp: 600,
      itemRemarks: 'Colour: navy blue',
    })
    expect(record.grandTotal).toBe(1377)
  })
})
