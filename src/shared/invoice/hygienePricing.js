const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100

export const LEGACY_HYGIENE_PRICING_RULE = 'ih_complexity_v1'
export const INTERMEDIATE_HYGIENE_PRICING_RULE = 'ih_standard_v1'
export const STANDARD_HYGIENE_PRICING_RULE = 'ih_standard_v2'

export const HYGIENE_PRICING_RULES = [
  LEGACY_HYGIENE_PRICING_RULE,
  INTERMEDIATE_HYGIENE_PRICING_RULE,
  STANDARD_HYGIENE_PRICING_RULE,
]

export const isKnownHygienePricingRule = (value) => HYGIENE_PRICING_RULES.includes(value)

export const normalizeHygienePricingRule = (value) => {
  if (isKnownHygienePricingRule(value)) return value
  throw new Error(`Unsupported IH pricing rule: ${value ?? 'null'}`)
}

export const isHistoricalHygienePricingRule = (value) =>
  value === LEGACY_HYGIENE_PRICING_RULE || value === INTERMEDIATE_HYGIENE_PRICING_RULE

export const getHygieneComplexityMultiplier = (value) => {
  const rating = Math.min(5, Math.max(1, Math.trunc(toNumber(value, 1))))
  return 1 + (rating - 1) * 0.1
}

export const getEffectiveWorkUnits = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export const calculateHygieneTotals = ({
  sampleCounts = 0,
  numWorkUnits = 0,
  unitPrice = 0,
  travelCharge = 0,
  customItems = [],
  discount = 0,
  sstPercent = 0,
  pricingRuleVersion = STANDARD_HYGIENE_PRICING_RULE,
  complexityRating = 1,
} = {}) => {
  const normalizedPricingRule = normalizeHygienePricingRule(pricingRuleVersion)
  const isLegacyPricing = normalizedPricingRule === LEGACY_HYGIENE_PRICING_RULE
  const isHistoricalPricing = isHistoricalHygienePricingRule(normalizedPricingRule)
  const effectiveWorkUnits = getEffectiveWorkUnits(numWorkUnits)
  const baseQuantity = toNumber(sampleCounts) * effectiveWorkUnits
  const normalizedComplexityRating = isLegacyPricing
    ? Math.min(5, Math.max(1, Math.trunc(toNumber(complexityRating, 1))))
    : 1
  const complexityMultiplier = isLegacyPricing
    ? getHygieneComplexityMultiplier(normalizedComplexityRating)
    : 1
  const serviceTotal = baseQuantity * Math.max(0, toNumber(unitPrice)) * complexityMultiplier
  const customTotal =
    normalizedPricingRule === STANDARD_HYGIENE_PRICING_RULE && Array.isArray(customItems)
      ? customItems.reduce(
          (sum, item) =>
            sum +
            roundMoney(
              Math.max(0, toNumber(item?.quantity)) * Math.max(0, toNumber(item?.unit_price)),
            ),
          0,
        )
      : 0
  const subtotalBeforeDiscount = roundMoney(
    serviceTotal + Math.max(0, toNumber(travelCharge)) + customTotal,
  )
  const discountTotal = roundMoney(Math.max(0, toNumber(discount)))
  const taxableTotal = roundMoney(Math.max(0, subtotalBeforeDiscount - discountTotal))
  const sstAmount = roundMoney(taxableTotal * (Math.max(0, toNumber(sstPercent)) / 100))
  const grandTotal = roundMoney(taxableTotal + sstAmount)

  return {
    effectiveWorkUnits,
    baseQuantity,
    pricingRuleVersion: normalizedPricingRule,
    complexityRating: normalizedComplexityRating,
    complexityMultiplier,
    serviceTotal: roundMoney(serviceTotal),
    customTotal: roundMoney(customTotal),
    subtotalBeforeDiscount,
    discountTotal,
    taxableTotal,
    sstAmount,
    subTotal: isHistoricalPricing ? taxableTotal : subtotalBeforeDiscount,
    grandTotal,
  }
}

export const buildStoredHygieneTotals = ({
  sampleCounts = 0,
  numWorkUnits = 0,
  travelCharge = 0,
  discount = 0,
  sstPercent = 0,
  sstAmount = 0,
  subTotal = 0,
  grandTotal = 0,
  pricingRuleVersion,
  complexityRating = 1,
} = {}) => {
  const rule = normalizeHygienePricingRule(pricingRuleVersion)
  if (!isHistoricalHygienePricingRule(rule)) {
    throw new Error('Stored IH totals are only valid for historical pricing rules.')
  }

  const normalizedRating =
    rule === LEGACY_HYGIENE_PRICING_RULE
      ? Math.min(5, Math.max(1, Math.trunc(toNumber(complexityRating, 1))))
      : 1
  const multiplier =
    rule === LEGACY_HYGIENE_PRICING_RULE ? getHygieneComplexityMultiplier(normalizedRating) : 1
  const discountTotal = Math.abs(toNumber(discount))
  const taxableTotal = Math.max(0, toNumber(subTotal))
  const grossSubtotal = taxableTotal + discountTotal
  const effectiveWorkUnits = getEffectiveWorkUnits(numWorkUnits)

  return {
    effectiveWorkUnits,
    baseQuantity: toNumber(sampleCounts) * effectiveWorkUnits,
    pricingRuleVersion: rule,
    complexityRating: normalizedRating,
    complexityMultiplier: multiplier,
    serviceTotal: Math.max(0, grossSubtotal - toNumber(travelCharge)),
    customTotal: 0,
    subtotalBeforeDiscount: parseFloat(grossSubtotal.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    taxableTotal: parseFloat(taxableTotal.toFixed(2)),
    sstAmount: parseFloat(toNumber(sstAmount).toFixed(2)),
    subTotal: parseFloat(taxableTotal.toFixed(2)),
    grandTotal: parseFloat(toNumber(grandTotal).toFixed(2)),
    sstPercent: toNumber(sstPercent),
  }
}
