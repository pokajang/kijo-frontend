import {
  trainingRateOptions,
  trainingTravelRegionOptions,
} from '../../../../quotes/training/trainingRates'
import {
  formatMoney as formatDisplayMoney,
  formatNumber as formatDisplayNumber,
} from '../../../../../../utils/formatters/numberFormatters'

export const hasValue = (value) => value !== null && value !== undefined && value !== ''

export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const toBoolean = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  }
  return false
}

export const formatMoney = (value) => formatDisplayMoney(toFiniteNumber(value))

export const formatNumber = (value) =>
  formatDisplayNumber(toFiniteNumber(value), { maximumFractionDigits: 2 })

export const formatPercentage = (value) => `${formatNumber(value)}%`

export const formatAddress = (client = {}) => {
  const locality = [client.zip, client.city].filter(Boolean).join(' ')
  return [client.address, locality, client.state].filter(Boolean).join(', ') || 'Not provided'
}

export const formatDateRange = (formData, getDateOnly) => {
  if (formData?.toBeConfirmed) return 'To be confirmed'

  const formatDate = typeof getDateOnly === 'function' ? getDateOnly : (value) => value || ''
  const start = formatDate(formData?.selectedDate)
  const end = formatDate(formData?.selectedEndDate)
  if (!start && !end) return 'Not provided'
  if (!end || start === end) return start || end
  return `${start || 'Not provided'} to ${end}`
}

export const getPricingBasisLabel = (value) => {
  if (value === 'per_pax') return 'Per Pax'
  if (value === 'per_session') return 'Per Session / Class'
  return value || 'Not provided'
}

export const getTrainingRateLabel = (value) =>
  trainingRateOptions.find((option) => option.value === value)?.label || value || 'Not provided'

export const getTravelRegionLabel = (value) =>
  trainingTravelRegionOptions.find((option) => option.value === value)?.label ||
  value ||
  'Not provided'

export const getProposalLanguageLabel = (value) => {
  if (value === 'ms-MY') return 'Bahasa Melayu'
  if (value === 'en') return 'English'
  return value || 'Not provided'
}

export const buildTrainingCalculationRows = (record = {}) => {
  const formData = record.formData || {}
  const isPerPax = formData.pricingBasis === 'per_pax'
  const sessions = toFiniteNumber(formData.sessionCount)
  const duration = toFiniteNumber(formData.trainingDuration)
  const pax = toFiniteNumber(formData.noOfPax)
  const unitPrice = toFiniteNumber(formData.unitPrice)
  const mealPrice = toFiniteNumber(formData.mealPrice)
  const mealsProvided = toBoolean(formData.mealsProvided)
  const discountAmount = toFiniteNumber(record.discountAmount ?? formData.discountValue)
  const durationUnit = formData.durationUnit || 'day(s)'

  const trainingCalculation = isPerPax
    ? `${formatNumber(pax)} pax × ${formatMoney(unitPrice)} per pax`
    : `${formatNumber(sessions)} session(s) × ${formatNumber(
        duration,
      )} ${durationUnit} × ${formatMoney(unitPrice)}`

  const mealCalculation = mealsProvided
    ? isPerPax
      ? `${formatNumber(pax)} pax × ${formatMoney(mealPrice)} per pax`
      : `${formatNumber(pax)} pax × ${formatNumber(duration)} ${durationUnit} × ${formatNumber(
          sessions,
        )} session(s) × ${formatMoney(mealPrice)}`
    : 'Not applicable'

  return [
    {
      key: 'training',
      label: 'Training Cost',
      calculation: trainingCalculation,
      amount: toFiniteNumber(record.trainingTotal),
    },
    {
      key: 'mobilization',
      label: 'Mobilization Costs',
      calculation: toFiniteNumber(record.mobilizationCost) > 0 ? 'Fixed charge' : 'No charge',
      amount: toFiniteNumber(record.mobilizationCost),
    },
    {
      key: 'meals',
      label: 'Meals',
      calculation: mealCalculation,
      amount: toFiniteNumber(record.mealTotal),
    },
    {
      key: 'discount',
      label: discountAmount > 0 ? `Discount — ${formData.discountType || 'Applied'}` : 'Discount',
      calculation: discountAmount > 0 ? 'Deduction' : 'No discount',
      amount: discountAmount,
      negative: discountAmount > 0,
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      calculation: '',
      amount: toFiniteNumber(record.subtotal),
      emphasis: 'subtotal',
    },
    {
      key: 'sst',
      label: 'SST',
      calculation: `${formatPercentage(formData.sstRate)} of subtotal`,
      amount: toFiniteNumber(record.sstAmount ?? record.sst_amount),
    },
    {
      key: 'hrd',
      label: 'HRD Charge',
      calculation: `${formatPercentage(formData.hrdCharge)} of net training cost`,
      amount: toFiniteNumber(record.hrdAmount ?? record.hrd_amount),
    },
    {
      key: 'grand-total',
      label: 'Grand Total',
      calculation: '',
      amount: toFiniteNumber(record.grandTotal ?? record.amount),
      emphasis: 'grand-total',
    },
  ]
}
