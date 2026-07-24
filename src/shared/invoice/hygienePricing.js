const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const LEGACY_HYGIENE_PRICING_RULE = 'ih_complexity_v1'
export const STANDARD_HYGIENE_PRICING_RULE = 'ih_standard_v2'

export const normalizeHygienePricingRule = (value) =>
  value === LEGACY_HYGIENE_PRICING_RULE
    ? LEGACY_HYGIENE_PRICING_RULE
    : STANDARD_HYGIENE_PRICING_RULE

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
  const effectiveWorkUnits = getEffectiveWorkUnits(numWorkUnits)
  const baseQuantity = toNumber(sampleCounts) * effectiveWorkUnits
  const normalizedComplexityRating = isLegacyPricing
    ? Math.min(5, Math.max(1, Math.trunc(toNumber(complexityRating, 1))))
    : 1
  const complexityMultiplier = isLegacyPricing
    ? getHygieneComplexityMultiplier(normalizedComplexityRating)
    : 1
  const serviceTotal = baseQuantity * toNumber(unitPrice) * complexityMultiplier
  const customTotal =
    !isLegacyPricing && Array.isArray(customItems)
      ? customItems.reduce(
          (sum, item) => sum + toNumber(item?.quantity) * toNumber(item?.unit_price),
          0,
        )
      : 0
  const subtotalBeforeDiscount = serviceTotal + toNumber(travelCharge) + customTotal
  const discountTotal = Math.abs(toNumber(discount))
  const taxableTotal = Math.max(0, subtotalBeforeDiscount - discountTotal)
  const sstAmount = taxableTotal * (toNumber(sstPercent) / 100)
  const grandTotal = taxableTotal + sstAmount

  return {
    effectiveWorkUnits,
    baseQuantity,
    pricingRuleVersion: normalizedPricingRule,
    complexityRating: normalizedComplexityRating,
    complexityMultiplier,
    serviceTotal,
    customTotal,
    subtotalBeforeDiscount: parseFloat(subtotalBeforeDiscount.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    taxableTotal: parseFloat(taxableTotal.toFixed(2)),
    sstAmount: parseFloat(sstAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  }
}
