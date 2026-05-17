const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
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
} = {}) => {
  const effectiveWorkUnits = getEffectiveWorkUnits(numWorkUnits)
  const baseQuantity = toNumber(sampleCounts) * effectiveWorkUnits
  const serviceTotal = baseQuantity * toNumber(unitPrice)
  const customTotal = Array.isArray(customItems)
    ? customItems.reduce(
        (sum, item) => sum + toNumber(item?.quantity) * toNumber(item?.unit_price),
        0,
      )
    : 0
  const subtotalBeforeDiscount = serviceTotal + toNumber(travelCharge) + customTotal
  const discountTotal = Math.abs(toNumber(discount))
  const taxableTotal = subtotalBeforeDiscount - discountTotal
  const sstAmount = taxableTotal * (toNumber(sstPercent) / 100)
  const grandTotal = taxableTotal + sstAmount

  return {
    effectiveWorkUnits,
    baseQuantity,
    serviceTotal,
    customTotal,
    subtotalBeforeDiscount: parseFloat(subtotalBeforeDiscount.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    taxableTotal: parseFloat(taxableTotal.toFixed(2)),
    sstAmount: parseFloat(sstAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  }
}
