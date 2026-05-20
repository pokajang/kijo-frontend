import { describe, expect, it } from 'vitest'
import trainingRateConfig from '../config/trainingRates.json'
import {
  getTrainingRateOption,
  getTrainingTravelRegion,
  shouldApplyTrainingRateFloors,
  trainingRateOptions,
  trainingTravelRegionOptions,
  TRAINING_RATE_TYPES,
} from './trainingRates'

describe('trainingRates', () => {
  it('builds pricing options from configured rate definitions', () => {
    expect(trainingRateOptions).toHaveLength(Object.keys(trainingRateConfig.rates).length)
    expect(getTrainingRateOption(TRAINING_RATE_TYPES.CLIENT_SITE_NORMAL)).toMatchObject({
      label: 'Client Site - Normal Training',
      pricingBasis: 'per_session',
      unitCost: 4500,
      rateLabel: 'RM 4,500.00 / day',
    })
  })

  it('exposes the special training minimum and approval copy', () => {
    expect(getTrainingRateOption(TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_APPROVAL)).toMatchObject({
      label: 'Special Training / Special Client',
      unitCost: 5000,
      rateLabel: 'RM 5,000.00 minimum; management approval required',
      requiresManagementApproval: true,
    })
  })

  it('exposes configured travel charges', () => {
    expect(trainingTravelRegionOptions).toHaveLength(
      Object.keys(trainingRateConfig.travelRegions).length,
    )
    expect(getTrainingTravelRegion('central_border')).toMatchObject({
      amount: 800,
    })
  })

  it('does not apply configured rate floors to online or hourly training', () => {
    expect(
      shouldApplyTrainingRateFloors({
        trainingTypeOption: 'Online',
        durationUnit: 'day(s)',
        pricingBasis: 'per_session',
      }),
    ).toBe(false)

    expect(
      shouldApplyTrainingRateFloors({
        trainingTypeOption: 'Physical',
        durationUnit: 'hour(s)',
        pricingBasis: 'per_session',
      }),
    ).toBe(false)

    expect(
      shouldApplyTrainingRateFloors({
        trainingTypeOption: 'Physical',
        durationUnit: 'hour(s)',
        pricingBasis: 'per_pax',
      }),
    ).toBe(false)

    expect(
      shouldApplyTrainingRateFloors({
        trainingTypeOption: 'Physical',
        durationUnit: 'day(s)',
        pricingBasis: 'per_session',
      }),
    ).toBe(true)

    expect(
      shouldApplyTrainingRateFloors({
        trainingTypeOption: 'Physical',
        durationUnit: 'day(s)',
        pricingBasis: 'per_pax',
      }),
    ).toBe(true)
  })
})
