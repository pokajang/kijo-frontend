import { describe, expect, it } from 'vitest'
import { buildBreakdownFromPricing } from './pricingBreakdownBuilder'

describe('buildBreakdownFromPricing Industrial Hygiene', () => {
  it('builds service, travel, and discount rows from unit-price basis', () => {
    const breakdown = buildBreakdownFromPricing('Industrial Hygiene', {
      service_title: 'Chemical Exposure Monitoring at Seremban',
      sample_counts: 9,
      sample_unit: 'parameter(s)',
      num_work_units: 3,
      unit_price: 480,
      travel_qty: 1,
      travel_unit_price: 1800,
      discount_qty: 1,
      discount_unit_price: 200,
      hygiene_items: [],
    })

    expect(breakdown[0]).toMatchObject({
      item_description: 'Chemical Exposure Monitoring',
      quantity: 27,
      unit_price: 480,
    })
    expect(breakdown[1]).toMatchObject({
      item_description: 'Travel Charge',
      quantity: 1,
      unit_price: 1800,
    })
    expect(breakdown[2]).toMatchObject({
      item_description: 'Discount',
      quantity: 1,
      unit_price: -200,
    })
  })

  it('defaults blank work units to one service unit', () => {
    const breakdown = buildBreakdownFromPricing('Industrial Hygiene', {
      service_title: 'Industrial Hygiene',
      sample_counts: 9,
      sample_unit: 'sample(s)',
      num_work_units: '',
      unit_price: 480,
      travel_qty: 1,
      travel_unit_price: 1800,
      discount_qty: 1,
      discount_unit_price: 200,
      hygiene_items: [],
    })

    expect(breakdown[0]).toMatchObject({
      quantity: 9,
      unit_price: 480,
      unit: 'Lump Sum',
    })
  })
})
