import { describe, expect, it } from 'vitest'
import { buildPricingFromInvoice } from './invoicePricingMapper'
import { buildBreakdownFromPricing } from './pricingBreakdownBuilder'
import { normalizePaymentMethod } from './paymentUtils'

describe('invoice edit utilities', () => {
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

  it('normalizes payment method from service type and grant approval number', () => {
    expect(normalizePaymentMethod('Training', 'HRD-123')).toBe('HRD Grant')
    expect(normalizePaymentMethod('Training', '')).toBe('Direct Payment')
    expect(normalizePaymentMethod('Equipment Supply', 'HRD-123')).toBe('Direct Payment')
  })
})
