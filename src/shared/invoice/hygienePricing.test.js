import { describe, expect, it } from 'vitest'
import { calculateHygieneTotals } from './hygienePricing'

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
})
