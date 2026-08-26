import {
  buildStoredHygieneTotals,
  getHygieneComplexityMultiplier,
  isHistoricalHygienePricingRule,
  LEGACY_HYGIENE_PRICING_RULE,
} from '../../../../../../shared/invoice/hygienePricing'
import {
  formatMoney,
  formatNumber,
  formatPercentage,
  toFiniteNumber,
} from '../../quotationDetailUtils'

export const getHygienePricingRuleLabel = (value) => {
  if (value === 'ih_complexity_v1') return 'Historical Complexity Pricing (V1)'
  if (value === 'ih_standard_v1') return 'Historical Standard Pricing (V1)'
  if (value === 'ih_standard_v2') return 'Standard Pricing (V2)'
  return value || 'Not provided'
}

export const buildHygieneCalculationRows = (record = {}) => {
  const formData = record.formData || {}
  const samples = toFiniteNumber(formData.sampleCounts)
  const workUnits = Math.max(1, toFiniteNumber(formData.numWorkUnits, 1))
  const unitPrice = toFiniteNumber(formData.unitPrice)
  const isLegacy = formData.pricingRuleVersion === LEGACY_HYGIENE_PRICING_RULE
  const complexityMultiplier = isLegacy
    ? getHygieneComplexityMultiplier(formData.complexityRating)
    : 1
  const travelCharge = toFiniteNumber(formData.travelCharge)
  const discount = toFiniteNumber(record.discountAmount ?? formData.discount)
  const storedSubtotal = toFiniteNumber(record.subtotal ?? formData.subTotal)
  const isCurrentPricing = formData.pricingRuleVersion === 'ih_standard_v2'
  const isHistoricalPricing = isHistoricalHygienePricingRule(formData.pricingRuleVersion)
  const calculatedServiceTotal = samples * workUnits * unitPrice * complexityMultiplier
  const items = Array.isArray(record.lineItems) ? record.lineItems : []
  const itemTotal = items.reduce(
    (sum, item) => sum + toFiniteNumber(item.lineTotal ?? item.line_total),
    0,
  )
  const storedHistoricalTotals = isHistoricalPricing
    ? buildStoredHygieneTotals({
        sampleCounts: samples,
        numWorkUnits: workUnits,
        travelCharge,
        discount,
        sstPercent: formData.sstPercent,
        sstAmount: record.sstAmount ?? record.sst_amount ?? formData.sstAmount,
        subTotal: storedSubtotal,
        grandTotal: record.grandTotal ?? record.amount ?? formData.grandTotal,
        pricingRuleVersion: formData.pricingRuleVersion,
        complexityRating: formData.complexityRating,
      })
    : null
  const serviceTotal = isCurrentPricing
    ? calculatedServiceTotal
    : storedHistoricalTotals
      ? Math.max(0, storedHistoricalTotals.serviceTotal - itemTotal)
      : Math.max(0, storedSubtotal + discount - travelCharge - itemTotal)
  const itemRows = items.map((item, index) => ({
    key: `additional-fee-${item.id ?? index}`,
    label: item.item_description || item.itemName || `Additional Fee ${index + 1}`,
    description: item.description || '',
    calculation: `${formatNumber(item.quantity)} ${item.unit || 'Lot'} × ${formatMoney(
      item.unitPrice ?? item.unit_price,
    )}`,
    amount: toFiniteNumber(item.lineTotal ?? item.line_total),
  }))
  const grossSubtotal = storedHistoricalTotals
    ? storedHistoricalTotals.subtotalBeforeDiscount
    : isCurrentPricing
      ? storedSubtotal
      : storedSubtotal + discount
  const taxableSubtotal = storedHistoricalTotals
    ? storedHistoricalTotals.taxableTotal
    : isCurrentPricing
      ? Math.max(0, storedSubtotal - discount)
      : storedSubtotal

  return [
    {
      key: 'service-cost',
      label: 'Service Cost',
      calculation: isCurrentPricing
        ? `${formatNumber(samples)} ${
            formData.sampleUnit || 'sample(s)'
          } × ${formatNumber(workUnits)} work unit(s) × ${formatMoney(unitPrice)}`
        : `Stored historical amount${
            isLegacy ? ` · Complexity ${complexityMultiplier.toFixed(1)}` : ''
          }`,
      amount: serviceTotal,
    },
    {
      key: 'mobilization',
      label: 'Mobilization & Accommodation',
      calculation: travelCharge > 0 ? 'Fixed charge' : 'No charge',
      amount: travelCharge,
    },
    ...itemRows,
    {
      key: 'gross-subtotal',
      label: 'Gross Subtotal',
      calculation: '',
      amount: grossSubtotal,
      emphasis: 'subtotal',
    },
    {
      key: 'discount',
      label: 'Discount',
      calculation: discount > 0 ? 'Deduction' : 'No discount',
      amount: discount,
      negative: discount > 0,
    },
    {
      key: 'subtotal',
      label: 'Subtotal After Discount',
      calculation: '',
      amount: taxableSubtotal,
      emphasis: 'subtotal',
    },
    {
      key: 'sst',
      label: 'SST',
      calculation: `${formatPercentage(formData.sstPercent)} of subtotal`,
      amount: toFiniteNumber(record.sstAmount ?? record.sst_amount ?? formData.sstAmount),
    },
    {
      key: 'grand-total',
      label: 'Grand Total',
      calculation: '',
      amount: toFiniteNumber(record.grandTotal ?? record.amount ?? formData.grandTotal),
      emphasis: 'grand-total',
    },
  ]
}
