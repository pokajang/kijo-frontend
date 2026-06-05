import trainingRateConfig from '../config/trainingRates.json'

export const TRAINING_RATE_TYPES = trainingRateConfig.rateTypes || {}
export const TRAINING_HOURLY_UNIT_COST = Number(trainingRateConfig.hourlyUnitCost || 500)
export const TRAINING_ONLINE_UNIT_COST = Number(trainingRateConfig.onlineUnitCost || 3500)

export const trainingRateOptions = Object.entries(trainingRateConfig.rates || {}).map(
  ([value, config]) => ({
    value,
    label: config.label || value,
    pricingBasis: config.pricingBasis || 'per_session',
    unitCost: Number(config.unitCost || 0),
    mealUnitCost: Number(config.mealUnitCost || 0),
    rateLabel: config.rateLabel || '',
    requiresManagementApproval: Boolean(config.requiresManagementApproval),
    enforceRateFloors: config.enforceRateFloors !== false,
  }),
)

export const trainingTravelRegionOptions = Object.entries(
  trainingRateConfig.travelRegions || {},
).map(([value, config]) => ({
  value,
  label: config.label,
  amount: Number(config.amount || 0),
}))

export const getTrainingRateOption = (value) =>
  trainingRateOptions.find((option) => option.value === value) || trainingRateOptions[0]

export const getTrainingTravelRegion = (value) =>
  trainingTravelRegionOptions.find((option) => option.value === value) ||
  trainingTravelRegionOptions[0]

export const shouldApplyTrainingRateFloors = ({
  trainingTypeOption,
  durationUnit,
  pricingBasis,
  trainingRateType,
} = {}) => {
  const rate = getTrainingRateOption(trainingRateType)
  if (rate && !rate.enforceRateFloors) return false
  if (trainingTypeOption === 'Online') return false
  if ((durationUnit || 'day(s)') !== 'day(s)') return false
  if (pricingBasis === 'per_pax') return true
  return true
}

export const getTrainingUnitPriceForDurationUnit = ({
  durationUnit,
  trainingRateType,
  trainingTypeOption,
  fallbackUnitPrice,
} = {}) => {
  if (durationUnit === 'hour(s)') return TRAINING_HOURLY_UNIT_COST
  if (durationUnit === 'day(s)' && trainingTypeOption === 'Online') {
    return TRAINING_ONLINE_UNIT_COST
  }
  if (durationUnit === 'day(s)') {
    const rate = getTrainingRateOption(trainingRateType)
    return rate.unitCost > 0 ? rate.unitCost : fallbackUnitPrice
  }
  return fallbackUnitPrice
}
