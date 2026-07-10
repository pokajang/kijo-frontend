import { describe, expect, it } from 'vitest'
import manpowerRateConfig from '../config/manpowerRates.json'
import {
  calculateManpowerTotals,
  getManpowerRate,
  inferManpowerRateType,
  MANPOWER_RATE_TYPES,
} from './manpowerRates'

const getConfiguredUnitCost = (rateType, durationMonths = 0) => {
  const rate = manpowerRateConfig.rates[rateType]
  const tier =
    rate.tiers?.find(
      (candidate) =>
        candidate.durationMonthsGreaterThan !== undefined &&
        durationMonths > Number(candidate.durationMonthsGreaterThan),
    ) || rate.tiers?.find((candidate) => candidate.default)

  return tier?.unitCost ?? rate.unitCost
}

describe('manpowerRates', () => {
  it('uses higher 3S rate for 6 months or less', () => {
    expect(
      getManpowerRate({ rateType: MANPOWER_RATE_TYPES.THREE_S, durationMonths: 6 }).unitCost,
    ).toBe(getConfiguredUnitCost(MANPOWER_RATE_TYPES.THREE_S, 6))
  })

  it('uses lower 3S rate for more than 6 months', () => {
    expect(
      getManpowerRate({ rateType: MANPOWER_RATE_TYPES.THREE_S, durationMonths: 7 }).unitCost,
    ).toBe(getConfiguredUnitCost(MANPOWER_RATE_TYPES.THREE_S, 7))
  })

  it('derives SSS service templates to the 3S yellow book rate', () => {
    expect(
      inferManpowerRateType({
        serviceTitle: 'Site Safety Supervisor (SSS)',
        serviceCode: 'MP-SSS',
      }),
    ).toBe(MANPOWER_RATE_TYPES.THREE_S)
  })

  it('derives SHO service templates to the SHO rate', () => {
    expect(
      inferManpowerRateType({
        serviceTitle: 'Safety And Health Officer (SHO)',
        serviceCode: 'MP-SHO',
      }),
    ).toBe(MANPOWER_RATE_TYPES.SHO)
  })

  it('falls back to other manpower rate type for unmatched service names', () => {
    expect(
      inferManpowerRateType({
        serviceTitle: 'Custom Rigging Technician',
        serviceCode: 'MP-999',
      }),
    ).toBe(MANPOWER_RATE_TYPES.OTHER)
  })

  it('uses hourly AESP totals', () => {
    expect(
      calculateManpowerTotals({
        unitCost: getConfiguredUnitCost(MANPOWER_RATE_TYPES.AESP),
        noOfPax: 2,
        durationHours: 8,
        billingUnit: 'hour',
        discount: 0,
        sstPercent: 0,
      }),
    ).toEqual({
      subTotal: (getConfiguredUnitCost(MANPOWER_RATE_TYPES.AESP) * 2 * 8).toFixed(2),
      sstAmount: '0.00',
      grandTotal: (getConfiguredUnitCost(MANPOWER_RATE_TYPES.AESP) * 2 * 8).toFixed(2),
    })
  })
})
