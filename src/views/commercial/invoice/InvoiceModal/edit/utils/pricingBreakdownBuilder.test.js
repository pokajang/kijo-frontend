import { describe, expect, it } from 'vitest'
import { buildBreakdownFromPricing } from './pricingBreakdownBuilder'

describe('buildBreakdownFromPricing Training', () => {
  it('builds training rows with dynamic qty/unit, discount and HRD rows', () => {
    const breakdown = buildBreakdownFromPricing('Training', {
      training_total: 700,
      training_qty: 2,
      training_unit: 'course',
      meal_total: 120,
      meal_qty: 3,
      meal_unit: 'set',
      mobilization_cost: 80,
      mobilization_qty: 1,
      mobilization_unit: 'Lot',
      discount_amount: 40,
      discount_qty: 2,
      discount_unit: 'Lot',
      hrd_rate: 10,
      hrd_amount: 90,
      hrd_qty: 1,
      hrd_unit: 'Lot',
      training_items: [
        {
          id: 11,
          item_description: 'Manual pack',
          description: 'Guide set',
          quantity: 2,
          unit: 'box',
          unit_price: 15,
        },
      ],
    })

    expect(breakdown).toEqual([
      {
        id: null,
        item_description: 'Training Fee',
        unit: 'course',
        quantity: 2,
        unit_price: 700,
        description: '',
      },
      {
        id: null,
        item_description: 'Meal Total',
        unit: 'set',
        quantity: 3,
        unit_price: 120,
        description: '',
      },
      {
        id: null,
        item_description: 'Mobilization Charge',
        unit: 'Lot',
        quantity: 1,
        unit_price: 80,
        description: '',
      },
      {
        id: 11,
        item_description: 'Manual pack',
        description: 'Guide set',
        unit: 'box',
        quantity: 2,
        unit_price: 15,
      },
      {
        id: null,
        item_description: 'Discount',
        unit: 'Lot',
        quantity: 2,
        unit_price: -40,
        description: '',
      },
      {
        id: null,
        item_description: '10% HRD Charge',
        unit: 'Lot',
        quantity: 1,
        unit_price: 90,
        description: '',
      },
    ])
  })

  it('omits HRD line when HRD amount is zero', () => {
    const breakdown = buildBreakdownFromPricing('Training', {
      training_total: 700,
      meal_total: 120,
      mobilization_cost: 80,
      discount_amount: 40,
      hrd_rate: 10,
      hrd_amount: 0,
    })

    expect(breakdown.map((line) => line.item_description)).not.toContain('10% HRD Charge')
    expect(breakdown[breakdown.length - 1].item_description).toBe('Discount')
  })

  it('preserves editable HRD row quantity and unit', () => {
    const breakdown = buildBreakdownFromPricing('Training', {
      training_total: 1000,
      meal_total: 0,
      mobilization_cost: 0,
      discount_amount: 0,
      hrd_rate: 4,
      hrd_amount: 40,
      hrd_qty: 2,
      hrd_unit: 'claim',
    })

    expect(breakdown[breakdown.length - 1]).toMatchObject({
      item_description: '4% HRD Charge',
      quantity: 2,
      unit: 'claim',
      unit_price: 40,
    })
  })
})

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

  it('carries legacy complexity into the invoice service unit price', () => {
    const breakdown = buildBreakdownFromPricing('Industrial Hygiene', {
      service_title: 'Legacy Monitoring',
      sample_counts: 10,
      sample_unit: 'sample(s)',
      num_work_units: 2,
      unit_price: 500,
      pricing_rule_version: 'ih_complexity_v1',
      complexity_rating: 4,
      hygiene_items: [],
    })

    expect(breakdown[0]).toMatchObject({
      quantity: 20,
      unit_price: 650,
    })
    expect(breakdown[0].description).toContain('complexity 4 (1.3x)')
  })
})
