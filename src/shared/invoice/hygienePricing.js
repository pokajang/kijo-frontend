const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100

export const LEGACY_HYGIENE_PRICING_RULE = 'ih_complexity_v1'
export const INTERMEDIATE_HYGIENE_PRICING_RULE = 'ih_standard_v1'
export const STANDARD_HYGIENE_PRICING_RULE = 'ih_standard_v2'

export const HYGIENE_SUBTOTAL_CONVENTION = {
  GROSS: 'gross-before-discount',
  NET: 'net-after-discount',
}

const HISTORICAL_TOTAL_TOLERANCE = 0.05

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

export const buildHygieneInvoicePricingSeed = (quote = {}) => {
  if (quote?.invoice_seed && typeof quote.invoice_seed === 'object') {
    return { ...quote.invoice_seed }
  }

  const pricingRuleVersion = isKnownHygienePricingRule(quote.pricing_rule_version)
    ? quote.pricing_rule_version
    : Array.isArray(quote.hygiene_items) && quote.hygiene_items.length > 0
      ? STANDARD_HYGIENE_PRICING_RULE
      : LEGACY_HYGIENE_PRICING_RULE
  const isHistorical = isHistoricalHygienePricingRule(pricingRuleVersion)
  const totals = isHistorical
    ? buildStoredHygieneTotals({
        sampleCounts: quote.sample_counts,
        numWorkUnits: quote.num_work_units,
        travelCharge: quote.travel_charge,
        discount: quote.discount,
        sstPercent: quote.sst_percent,
        sstAmount: quote.sst_amount,
        subTotal: quote.sub_total,
        grandTotal: quote.grand_total,
        pricingRuleVersion,
        complexityRating: quote.complexity_rating,
      })
    : null
  const titleParts = [String(quote.service_title || 'Industrial Hygiene').trim()]
  if (quote.service_code) titleParts[0] += ` (${quote.service_code})`
  if (quote.site_address) titleParts[0] += ` at ${quote.site_address}`

  return {
    service_title: titleParts[0],
    sample_counts: quote.sample_counts ?? 0,
    sample_unit: quote.sample_unit || 'sample(s)',
    num_work_units: Number(quote.num_work_units) > 0 ? Number(quote.num_work_units) : '',
    unit_price: quote.unit_price ?? 0,
    pricing_rule_version: pricingRuleVersion,
    complexity_rating: quote.complexity_rating ?? 1,
    travel_qty: 1,
    travel_unit: 'Lot',
    travel_unit_price: toNumber(quote.travel_charge),
    travel_charge: toNumber(quote.travel_charge),
    discount_qty: 1,
    discount_unit: 'Lot',
    discount_unit_price: toNumber(quote.discount),
    discount: toNumber(quote.discount),
    hygiene_items:
      pricingRuleVersion === STANDARD_HYGIENE_PRICING_RULE && Array.isArray(quote.hygiene_items)
        ? quote.hygiene_items.map((item) => ({
            id: item.id,
            item_description: item.item_description || '',
            description: item.description || '',
            unit: item.unit || 'Lot',
            quantity: toNumber(item.quantity),
            unit_price: toNumber(item.unit_price),
            line_type: 'custom',
            source_line_key: item.id ? `quote_ih_item:${item.id}` : null,
          }))
        : [],
    hygiene_items_initialized: true,
    sst_percent: quote.sst_percent ?? 0,
    sst_amount: quote.sst_amount ?? 0,
    sub_total: totals?.subtotalBeforeDiscount ?? quote.sub_total ?? 0,
    grand_total: quote.grand_total ?? 0,
    remarks: quote.inquiry_remarks ?? '',
    source_snapshot: {
      quote_id: quote.id ?? null,
      pricing_rule: pricingRuleVersion,
      quote_grand_total: toNumber(quote.grand_total),
      captured_at: new Date().toISOString(),
    },
  }
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
  const customTotal = Array.isArray(customItems)
    ? customItems.reduce(
        (sum, item) =>
          sum +
          (normalizedPricingRule === STANDARD_HYGIENE_PRICING_RULE || item?.is_custom
            ? roundMoney(
                Math.max(0, toNumber(item?.quantity)) * Math.max(0, toNumber(item?.unit_price)),
              )
            : 0),
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
  const discountTotal = roundMoney(Math.abs(toNumber(discount)))
  const storedSubTotal = roundMoney(Math.max(0, toNumber(subTotal)))
  const storedSstAmount = roundMoney(Math.max(0, toNumber(sstAmount)))
  const storedGrandTotal = roundMoney(Math.max(0, toNumber(grandTotal)))
  const taxableFromGrandTotal = roundMoney(Math.max(0, storedGrandTotal - storedSstAmount))
  const netConventionDifference = Math.abs(storedSubTotal - taxableFromGrandTotal)
  const grossConventionTaxable = roundMoney(Math.max(0, storedSubTotal - discountTotal))
  const grossConventionDifference = Math.abs(grossConventionTaxable - taxableFromGrandTotal)
  const usesLegacyGrossSubtotal =
    rule === LEGACY_HYGIENE_PRICING_RULE &&
    discountTotal > 0 &&
    grossConventionDifference <= HISTORICAL_TOTAL_TOLERANCE &&
    grossConventionDifference < netConventionDifference
  const subtotalConvention = usesLegacyGrossSubtotal
    ? HYGIENE_SUBTOTAL_CONVENTION.GROSS
    : HYGIENE_SUBTOTAL_CONVENTION.NET
  const grossSubtotal = roundMoney(
    usesLegacyGrossSubtotal ? storedSubTotal : storedSubTotal + discountTotal,
  )
  const taxableTotal = roundMoney(Math.max(0, grossSubtotal - discountTotal))
  const conventionDifference = usesLegacyGrossSubtotal
    ? grossConventionDifference
    : netConventionDifference
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
    sstAmount: storedSstAmount,
    subTotal: storedSubTotal,
    grandTotal: storedGrandTotal,
    sstPercent: toNumber(sstPercent),
    subtotalConvention,
    isReconciled: conventionDifference <= HISTORICAL_TOTAL_TOLERANCE,
  }
}
