import trainingRateConfig from '../config/trainingRates.json'

export const TRAINING_RATE_TYPES = trainingRateConfig.rateTypes || {}

export const trainingRateOptions = Object.entries(trainingRateConfig.rates || {}).map(
  ([value, config]) => ({
    value,
    label: config.label || value,
    pricingBasis: config.pricingBasis || 'per_session',
    unitCost: Number(config.unitCost || 0),
    mealUnitCost: Number(config.mealUnitCost || 0),
    rateLabel: config.rateLabel || '',
    requiresManagementApproval: Boolean(config.requiresManagementApproval),
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
} = {}) => {
  if (trainingTypeOption === 'Online') return false
  if ((durationUnit || 'day(s)') !== 'day(s)') return false
  if (pricingBasis === 'per_pax') return true
  return true
}
