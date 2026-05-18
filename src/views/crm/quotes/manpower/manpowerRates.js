import manpowerRateConfig from '../config/manpowerRates.json'

export const MANPOWER_RATE_TYPES = manpowerRateConfig.rateTypes

export const MANPOWER_RATE_OPTIONS = Object.entries(manpowerRateConfig.rates).map(
  ([value, rate]) => ({
    value,
    label: rate.label,
    billingUnit: rate.billingUnit,
    requiresManagementApproval: !!rate.requiresManagementApproval,
  }),
)

export const getManpowerRateOption = (rateType) =>
  MANPOWER_RATE_OPTIONS.find((option) => option.value === rateType) || null

export const getManpowerRate = ({ rateType, durationMonths }) => {
  const months = Number(durationMonths) || 0
  const rate = manpowerRateConfig.rates[rateType]

  if (!rate) {
    return {
      billingUnit: 'month',
      rateLabel: '',
      tierLabel: '',
      unitCost: 0,
    }
  }

  const tier =
    rate.tiers?.find(
      (candidate) =>
        candidate.durationMonthsGreaterThan !== undefined &&
        months > Number(candidate.durationMonthsGreaterThan),
    ) || rate.tiers?.find((candidate) => candidate.default)

  return {
    unitCost: tier?.unitCost ?? rate.unitCost ?? 0,
    billingUnit: rate.billingUnit || 'month',
    rateLabel: tier?.rateLabel ?? rate.rateLabel ?? '',
    tierLabel: tier?.tierLabel ?? rate.tierLabel ?? '',
    requiresManagementApproval: !!rate.requiresManagementApproval,
  }
}

const getConfiguredUnitCosts = (rateType) => {
  const rate = manpowerRateConfig.rates[rateType]
  if (!rate) return []

  const tierCosts = rate.tiers?.map((tier) => Number(tier.unitCost)).filter(Boolean) || []
  const standardCost = Number(rate.unitCost) || 0

  return standardCost > 0 ? [...tierCosts, standardCost] : tierCosts
}

export const inferManpowerRateType = ({ serviceTitle = '', serviceCode = '', unitCost = 0 }) => {
  const title = `${serviceTitle} ${serviceCode}`.toLowerCase()
  const numericUnitCost = Number(unitCost) || 0

  if (
    title.includes('aesp') ||
    getConfiguredUnitCosts(MANPOWER_RATE_TYPES.AESP).includes(numericUnitCost)
  ) {
    return MANPOWER_RATE_TYPES.AESP
  }
  if (
    title.includes('special') ||
    title.includes('safety manager') ||
    title.includes('rope access') ||
    title.includes('ohd')
  ) {
    return MANPOWER_RATE_TYPES.SPECIAL
  }
  if (
    title.includes('sho') ||
    title.includes('safety and health officer') ||
    getConfiguredUnitCosts(MANPOWER_RATE_TYPES.SHO).includes(numericUnitCost)
  ) {
    return MANPOWER_RATE_TYPES.SHO
  }
  if (
    title.includes('hse executive') ||
    title.includes('health safety executive') ||
    getConfiguredUnitCosts(MANPOWER_RATE_TYPES.HSE_EXECUTIVE).includes(numericUnitCost)
  ) {
    return MANPOWER_RATE_TYPES.HSE_EXECUTIVE
  }
  if (
    title.includes('3s') ||
    title.includes('sss') ||
    title.includes('yellow book') ||
    title.includes('site safety supervisor') ||
    getConfiguredUnitCosts(MANPOWER_RATE_TYPES.THREE_S).includes(numericUnitCost)
  ) {
    return MANPOWER_RATE_TYPES.THREE_S
  }

  return ''
}

export const calculateManpowerTotals = ({
  unitCost,
  noOfPax,
  durationMonths,
  durationHours,
  billingUnit,
  discount,
  sstPercent,
}) => {
  const unit = Number(unitCost) || 0
  const pax = Number(noOfPax) || 0
  const quantity = billingUnit === 'hour' ? Number(durationHours) || 0 : Number(durationMonths) || 0
  const discountAmount = Number(discount) || 0
  const sstRate = Number(sstPercent) || 0
  const subTotal = unit * pax * quantity - discountAmount
  const sstAmount = (sstRate / 100) * subTotal
  const grandTotal = subTotal + sstAmount

  return {
    subTotal: subTotal.toFixed(2),
    sstAmount: sstAmount.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  }
}
