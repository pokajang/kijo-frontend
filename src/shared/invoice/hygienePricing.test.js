import { describe, expect, it } from 'vitest'
import {
  buildStoredHygieneTotals,
  calculateHygieneTotals,
  INTERMEDIATE_HYGIENE_PRICING_RULE,
  LEGACY_HYGIENE_PRICING_RULE,
  STANDARD_HYGIENE_PRICING_RULE,
} from './hygienePricing'

describe('calculateHygieneTotals', () => {
  it('calculates service, travel, subtotal, and grand total without discount or SST', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 9,
      numWorkUnits: 3,
      unitPrice: 480,
      travelCharge: 1800,
    })

    expect(totals.serviceTotal).toBe(12960)
    expect(totals.subtotalBeforeDiscount).toBe(14760)
    expect(totals.grandTotal).toBe(14760)
  })

  it('applies discount after subtotal when SST is zero', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 9,
      numWorkUnits: 3,
      unitPrice: 480,
      travelCharge: 1800,
      discount: 200,
    })

    expect(totals.subtotalBeforeDiscount).toBe(14760)
    expect(totals.discountTotal).toBe(200)
    expect(totals.grandTotal).toBe(14560)
  })

  it('applies SST after discount', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 9,
      numWorkUnits: 3,
      unitPrice: 480,
      travelCharge: 1800,
      discount: 200,
      sstPercent: 8,
    })

    expect(totals.subtotalBeforeDiscount).toBe(14760)
    expect(totals.taxableTotal).toBe(14560)
    expect(totals.sstAmount).toBe(1164.8)
    expect(totals.grandTotal).toBe(15724.8)
  })

  it('defaults blank work units to one', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 9,
      numWorkUnits: '',
      unitPrice: 480,
      travelCharge: 1800,
      discount: 200,
    })

    expect(totals.effectiveWorkUnits).toBe(1)
    expect(totals.serviceTotal).toBe(4320)
    expect(totals.subtotalBeforeDiscount).toBe(6120)
    expect(totals.grandTotal).toBe(5920)
  })

  it('includes custom additional fee items before discount and SST', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 2,
      numWorkUnits: 1,
      unitPrice: 500,
      travelCharge: 100,
      customItems: [
        { quantity: 1, unit_price: 250 },
        { quantity: 2, unit_price: 75 },
      ],
      discount: 50,
      sstPercent: 8,
    })

    expect(totals.serviceTotal).toBe(1000)
    expect(totals.customTotal).toBe(400)
    expect(totals.subtotalBeforeDiscount).toBe(1500)
    expect(totals.sstAmount).toBe(116)
    expect(totals.grandTotal).toBe(1566)
  })

  it('clamps taxable total at zero when discount exceeds subtotal', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 1,
      numWorkUnits: 1,
      unitPrice: 100,
      discount: 150,
      sstPercent: 8,
    })

    expect(totals.taxableTotal).toBe(0)
    expect(totals.sstAmount).toBe(0)
    expect(totals.grandTotal).toBe(0)
  })

  it('applies the archived complexity multiplier for legacy quotations', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 10,
      numWorkUnits: 2,
      unitPrice: 500,
      travelCharge: 200,
      discount: 300,
      sstPercent: 8,
      pricingRuleVersion: LEGACY_HYGIENE_PRICING_RULE,
      complexityRating: 4,
      customItems: [{ quantity: 1, unit_price: 999 }],
    })

    expect(totals.pricingRuleVersion).toBe(LEGACY_HYGIENE_PRICING_RULE)
    expect(totals.complexityMultiplier).toBe(1.3)
    expect(totals.serviceTotal).toBe(13000)
    expect(totals.customTotal).toBe(0)
    expect(totals.taxableTotal).toBe(12900)
    expect(totals.grandTotal).toBe(13932)
  })

  it('keeps complexity disabled for standard V2 quotations', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 2,
      numWorkUnits: 1,
      unitPrice: 500,
      pricingRuleVersion: STANDARD_HYGIENE_PRICING_RULE,
      complexityRating: 5,
    })

    expect(totals.complexityMultiplier).toBe(1)
    expect(totals.serviceTotal).toBe(1000)
  })

  it('supports intermediate pricing with net subtotal and no complexity or items', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 2,
      numWorkUnits: 1,
      unitPrice: 500,
      travelCharge: 100,
      customItems: [{ quantity: 1, unit_price: 400 }],
      discount: 50,
      sstPercent: 8,
      pricingRuleVersion: INTERMEDIATE_HYGIENE_PRICING_RULE,
      complexityRating: 5,
    })

    expect(totals.complexityMultiplier).toBe(1)
    expect(totals.customTotal).toBe(0)
    expect(totals.subTotal).toBe(1050)
    expect(totals.grandTotal).toBe(1134)
  })

  it('preserves an intermediate historical snapshot with a precision variance', () => {
    const totals = buildStoredHygieneTotals({
      sampleCounts: 120,
      numWorkUnits: 1,
      unitPrice: 79.17,
      discount: 200,
      subTotal: 9300,
      grandTotal: 9300,
      pricingRuleVersion: INTERMEDIATE_HYGIENE_PRICING_RULE,
      complexityRating: 4,
    })

    expect(totals.complexityRating).toBe(1)
    expect(totals.serviceTotal).toBe(9500)
    expect(totals.subTotal).toBe(9300)
    expect(totals.grandTotal).toBe(9300)
  })

  it('fails closed for unknown pricing rules', () => {
    expect(() =>
      calculateHygieneTotals({
        pricingRuleVersion: 'unknown-rule',
      }),
    ).toThrow('Unsupported IH pricing rule')
  })

  it('rounds each additional-fee line before subtotal and tax like the backend', () => {
    const totals = calculateHygieneTotals({
      sampleCounts: 1,
      numWorkUnits: 1,
      unitPrice: 10,
      customItems: [
        { quantity: 3, unit_price: 0.335 },
        { quantity: 3, unit_price: 0.335 },
      ],
      discount: 0.01,
      sstPercent: 8,
      pricingRuleVersion: STANDARD_HYGIENE_PRICING_RULE,
    })

    expect(totals.customTotal).toBe(2.02)
    expect(totals.subtotalBeforeDiscount).toBe(12.02)
    expect(totals.taxableTotal).toBe(12.01)
    expect(totals.sstAmount).toBe(0.96)
    expect(totals.grandTotal).toBe(12.97)
  })
})
