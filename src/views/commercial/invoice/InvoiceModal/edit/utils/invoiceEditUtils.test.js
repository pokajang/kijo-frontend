import { describe, expect, it } from 'vitest'
import { buildPricingFromInvoice } from './invoicePricingMapper'
import { buildBreakdownFromPricing } from './pricingBreakdownBuilder'
import { normalizePaymentMethod } from './paymentUtils'

describe('invoice edit utilities', () => {
  it('derives an unstored SST rate from the taxable subtotal after discount', () => {
    const { pricing } = buildPricingFromInvoice({
      service_type: 'Industrial Hygiene',
      amount: 3000,
      sst_amount: 236,
      grand_total: 3186,
      breakdown: [
        {
          line_type: 'service',
          item_description: 'LEV Inspection',
          description: '2 sample(s) x 1 work units',
          quantity: 2,
          unit: 'sample(s)',
          unit_price: 1500,
        },
        {
          line_type: 'discount',
          item_description: 'Commercial adjustment',
          quantity: 1,
          unit: 'Lot',
          unit_price: -50,
        },
      ],
    })

    expect(pricing.sst_percent).toBe(8)
    expect(pricing.sub_total).toBe(3000)
    expect(pricing.grand_total).toBe(3186)
  })

  it('maps training breakdown lines including HRD row and keeps HRD out of training items', () => {
    const { pricing } = buildPricingFromInvoice({
      service_type: 'Training',
      amount: '1140',
      sst_amount: '85.5',
      grand_total: '1225.5',
      breakdown: [
        {
          id: 101,
          item_description: 'Training Fee',
          description: '',
          quantity: '2',
          unit: 'Lot',
          unit_price: '900',
        },
        {
          id: 102,
          item_description: 'Meal Total',
          description: '',
          quantity: '3',
          unit: 'set',
          unit_price: '120',
        },
        {
          id: 103,
          item_description: 'Mobilization Charge',
          description: '',
          quantity: '1.5',
          unit: 'trip',
          unit_price: '80',
        },
        {
          id: 104,
          item_description: 'Custom Item',
          description: 'Lab set',
          quantity: '2',
          unit: 'set',
          unit_price: '15',
        },
        {
          id: 107,
          item_description: 'Custom HRD Chargeback',
          description: 'Not HRD fee row',
          quantity: '1',
          unit: 'Lot',
          unit_price: '7',
        },
        {
          id: 105,
          item_description: 'Discount',
          description: '',
          quantity: '2',
          unit: 'Lot',
          unit_price: '-20',
        },
        {
          id: 106,
          item_description: '8% HRD Charge',
          description: '',
          quantity: '1',
          unit: 'Lot',
          unit_price: '78',
        },
      ],
    })

    expect(pricing.training_total).toBe(900)
    expect(pricing.training_qty).toBe(2)
    expect(pricing.training_unit).toBe('Lot')
    expect(pricing.meal_total).toBe(120)
    expect(pricing.meal_qty).toBe(3)
    expect(pricing.meal_unit).toBe('set')
    expect(pricing.mobilization_cost).toBe(80)
    expect(pricing.mobilization_qty).toBe(1.5)
    expect(pricing.mobilization_unit).toBe('trip')
    expect(pricing.discount_amount).toBe(20)
    expect(pricing.discount_qty).toBe(2)
    expect(pricing.hrd_rate).toBe(8)
    expect(pricing.hrd_amount).toBe(78)
    expect(pricing.training_items).toEqual([
      {
        id: 104,
        item_description: 'Custom Item',
        description: 'Lab set',
        unit: 'set',
        quantity: 2,
        unit_price: 15,
      },
      {
        id: 107,
        item_description: 'Custom HRD Chargeback',
        description: 'Not HRD fee row',
        unit: 'Lot',
        quantity: 1,
        unit_price: 7,
      },
    ])
  })

  it('maps equipment invoice breakdown lines into editable pricing fields', () => {
    const { pricing } = buildPricingFromInvoice({
      service_type: 'Equipment Supply',
      amount: '970',
      sst_amount: '58.20',
      grand_total: '1028.20',
      remarks: 'Handle with care',
      breakdown: [
        {
          id: 10,
          item_description: 'Gas detector',
          description: 'Portable unit',
          quantity: '2',
          unit: 'unit',
          unit_price: '500',
        },
        {
          item_description: 'Discount RM',
          quantity: '1',
          unit: 'Lot',
          unit_price: '-100',
        },
        {
          item_description: 'Delivery Charge',
          quantity: '2',
          unit: 'trip',
          unit_price: '25',
        },
        {
          item_description: 'Misc Charge',
          quantity: '1',
          unit: 'Lot',
          unit_price: '20',
        },
      ],
    })

    expect(pricing.equipment_items).toEqual([
      {
        id: 10,
        item_name: 'Gas detector',
        description: 'Portable unit',
        item_remarks: '',
        unit: 'unit',
        quantity: 2,
        unit_price: 500,
        marked_up_price: 500,
      },
    ])
    expect(pricing.discount).toBe(100)
    expect(pricing.delivery_charge).toBe(50)
    expect(pricing.misc_charge).toBe(20)
    expect(pricing.sub_total).toBe(970)
    expect(pricing.sst_percent).toBeCloseTo(6)
    expect(pricing.grand_total).toBe(1028.2)
    expect(pricing.remarks).toBe('Handle with care')
  })

  it('builds manpower breakdown with multi-month quantity and discount', () => {
    const breakdown = buildBreakdownFromPricing('Manpower Supply', {
      service_title: 'Safety officer',
      claim_type: 'multi',
      duration: 3,
      quantity: 2,
      unit: 'pax-mth',
      unit_cost: 1500,
      discount: 100,
      discount_qty: 2,
      discount_unit: 'Lot',
      manpower_items: [
        {
          id: '7',
          item_description: 'Accommodation',
          description: 'Site allowance',
          unit: 'Lot',
          quantity: 1,
          unit_price: 300,
        },
      ],
    })

    expect(breakdown[0]).toMatchObject({
      item_description: 'Safety officer',
      unit: 'pax-mth',
      quantity: 6,
      unit_price: 1500,
      description: '2 pax x 3 months',
    })
    expect(breakdown[1]).toMatchObject({
      id: 7,
      item_description: 'Accommodation',
      unit_price: 300,
    })
    expect(breakdown[2]).toMatchObject({
      item_description: 'Discount',
      quantity: 2,
      unit_price: -100,
    })
  })

  it('builds equipment breakdown from marked-up price variants', () => {
    const breakdown = buildBreakdownFromPricing('Equipment Supply', {
      equipment_items: [
        {
          item_name: 'Gas detector',
          description: 'Portable unit',
          quantity: 2,
          unit: 'unit',
          unit_price: 100,
          marked_up_price: '',
          markedUpPrice: 150,
        },
      ],
      discount: 0,
      delivery_charge: 0,
      misc_charge: 0,
    })

    expect(breakdown[0]).toMatchObject({
      item_description: 'Gas detector',
      quantity: 2,
      unit_price: 150,
    })
  })

  it('maps Industrial Hygiene additional fee rows without relying on breakdown order', () => {
    const { pricing } = buildPricingFromInvoice({
      service_type: 'Industrial Hygiene',
      invoice_purpose: 'Industrial Hygiene invoice',
      amount: '1540',
      sst_amount: '0',
      grand_total: '1240',
      breakdown: [
        {
          id: 22,
          item_description: 'Smoke sample analysis',
          description: 'Smoke lab analysis row',
          quantity: '2',
          unit: 'sample',
          unit_price: '120',
        },
        {
          id: 20,
          item_description: 'Chemical Exposure Monitoring',
          description: '2 sample(s) x 1 work units',
          quantity: '2',
          unit: 'sample(s)',
          unit_price: '500',
        },
        {
          id: 21,
          item_description: 'Travel Charge',
          description: '',
          quantity: '1',
          unit: 'Lot',
          unit_price: '0',
        },
        {
          id: 23,
          item_description: 'Smoke professional fee',
          description: 'Smoke report writing',
          quantity: '1',
          unit: 'Lot',
          unit_price: '300',
        },
        {
          id: 24,
          item_description: 'Discount',
          description: '',
          quantity: '1',
          unit: 'Lot',
          unit_price: '-300',
        },
      ],
    })

    expect(pricing.service_title).toBe('Industrial Hygiene invoice')
    expect(pricing.sample_counts).toBe(2)
    expect(pricing.num_work_units).toBe(1)
    expect(pricing.unit_price).toBe(500)
    expect(pricing.discount).toBe(300)
    expect(pricing.hygiene_items).toEqual([
      expect.objectContaining({
        id: 22,
        item_description: 'Smoke sample analysis',
        description: 'Smoke lab analysis row',
        unit: 'sample',
        quantity: 2,
        unit_price: 120,
      }),
      expect.objectContaining({
        id: 23,
        item_description: 'Smoke professional fee',
        description: 'Smoke report writing',
        unit: 'Lot',
        quantity: 1,
        unit_price: 300,
      }),
    ])
  })

  it('builds Industrial Hygiene breakdown with additional fee rows before discount', () => {
    const breakdown = buildBreakdownFromPricing('Industrial Hygiene', {
      service_title: 'Chemical Exposure Monitoring at Site A',
      sample_counts: 2,
      sample_unit: 'sample(s)',
      num_work_units: 1,
      unit_price: 500,
      travel_qty: 1,
      travel_unit_price: 0,
      discount_qty: 1,
      discount_unit_price: 300,
      hygiene_items: [
        {
          id: '55',
          item_description: 'Smoke sample analysis',
          description: 'Smoke lab analysis row',
          quantity: 2,
          unit: 'sample',
          unit_price: 120,
        },
      ],
    })

    expect(breakdown.map((line) => line.item_description)).toEqual([
      'Chemical Exposure Monitoring',
      'Travel Charge',
      'Smoke sample analysis',
      'Discount',
    ])
    expect(breakdown[2]).toMatchObject({
      id: 55,
      quantity: 2,
      unit_price: 120,
    })
  })

  it('normalizes payment method from service type and grant approval number', () => {
    expect(normalizePaymentMethod('Training', 'HRD-123')).toBe('HRD Grant')
    expect(normalizePaymentMethod('Training', '')).toBe('Direct Payment')
    expect(normalizePaymentMethod('Equipment Supply', 'HRD-123')).toBe('Direct Payment')
  })
})
