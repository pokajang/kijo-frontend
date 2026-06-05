import { describe, expect, it } from 'vitest'
import trainingRateConfig from '../config/trainingRates.json'
import {
  getTrainingRateOption,
  getTrainingTravelRegion,
  getTrainingUnitPriceForDurationUnit,
  shouldApplyTrainingRateFloors,
  TRAINING_HOURLY_UNIT_COST,
  TRAINING_ONLINE_UNIT_COST,
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

  it('exposes the special training reference rate without an approval blocker', () => {
    expect(getTrainingRateOption(TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_APPROVAL)).toMatchObject({
      label: 'Special Training / Special Client',
      unitCost: 5000,
      rateLabel: 'Reference RM 5,000.00 / day',
      requiresManagementApproval: false,
      enforceRateFloors: false,
    })
  })

  it('does not enforce floors for special trainer or special client categories', () => {
    expect(getTrainingRateOption(TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_TRAINER)).toMatchObject({
      label: 'Client Site - Special Trainer',
      unitCost: 5000,
      rateLabel: 'Reference RM 5,000.00 / day',
      enforceRateFloors: false,
    })

    const floorExemptInput = {
      trainingTypeOption: 'Physical',
      durationUnit: 'day(s)',
      pricingBasis: 'per_session',
    }

    expect(
      shouldApplyTrainingRateFloors({
        ...floorExemptInput,
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_TRAINER,
      }),
    ).toBe(false)

    expect(
      shouldApplyTrainingRateFloors({
        ...floorExemptInput,
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_APPROVAL,
      }),
    ).toBe(false)
  })

  it('does not block any training category with management approval', () => {
    const approvalCategories = trainingRateOptions
      .filter((option) => option.requiresManagementApproval)
      .map((option) => option.value)

    expect(approvalCategories).toEqual([])
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
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_NORMAL,
      }),
    ).toBe(true)

    expect(
      shouldApplyTrainingRateFloors({
        trainingTypeOption: 'Physical',
        durationUnit: 'day(s)',
        pricingBasis: 'per_pax',
        trainingRateType: TRAINING_RATE_TYPES.SAFEX_INDIVIDUAL_AESP,
      }),
    ).toBe(true)
  })

  it('prefills unit price when switching between hourly and daily duration units', () => {
    expect(
      getTrainingUnitPriceForDurationUnit({
        durationUnit: 'hour(s)',
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_NORMAL,
        trainingTypeOption: 'Physical',
        fallbackUnitPrice: 4500,
      }),
    ).toBe(TRAINING_HOURLY_UNIT_COST)

    expect(
      getTrainingUnitPriceForDurationUnit({
        durationUnit: 'day(s)',
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_APPROVAL,
        trainingTypeOption: 'Physical',
        fallbackUnitPrice: 500,
      }),
    ).toBe(5000)

    expect(
      getTrainingUnitPriceForDurationUnit({
        durationUnit: 'day(s)',
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_NORMAL,
        trainingTypeOption: 'Online',
        fallbackUnitPrice: 500,
      }),
    ).toBe(TRAINING_ONLINE_UNIT_COST)

    expect(
      getTrainingUnitPriceForDurationUnit({
        durationUnit: 'hour(s)',
        trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_APPROVAL,
        trainingTypeOption: 'Online',
        fallbackUnitPrice: 3500,
      }),
    ).toBe(TRAINING_HOURLY_UNIT_COST)
  })
})
