// crm/quotes/training/calculations.js

/**
 * Calculate base training cost
 * @param {number} qty - Number of sessions
 * @param {number} duration - Days per session
 * @param {number} unitPrice - Price basis amount
 * @param {number} pax - Number of participants
 * @param {'per_session'|'per_pax'} pricingBasis
 * @returns {number} Training cost before any charges or discounts
 */
export const calculateTrainingTotal = (
  qty,
  duration,
  unitPrice,
  pax = 0,
  pricingBasis = 'per_session',
) => {
  const q = Number(qty || 0)
  const d = Number(duration || 0)
  const p = Number(unitPrice || 0)
  const x = Number(pax || 0)

  if (pricingBasis === 'per_pax') {
    return x * p
  }

  return q * d * p
}

/**
 * Calculate total cost of meals
 * @param {string} provided - "Yes" or "No"
 * @param {number} mealPrice - Price per pax per day
 * @param {number} pax - Number of participants
 * @param {number} duration - Days per session
 * @param {number} qty - Number of sessions
 * @returns {number} Meal cost or 0 if not applicable
 */
export const calculateMealTotal = (provided, mealPrice, pax, duration, qty) =>
  provided === 'Yes' ? pax * mealPrice * duration * qty : 0

/**
 * Parse discount value into a usable number
 * @param {string|number} discountValue
 * @returns {number}
 */
export const calculateDiscount = (discountValue) => Number(discountValue || 0)

/**
 * Parse mobilization charge into a usable number
 * @param {string|number} travelCharge
 * @returns {number}
 */
export const calculateMobilization = (travelCharge) => Number(travelCharge || 0)

/**
 * Calculate subtotal before SST and HRD
 * @param {number} trainingTotal
 * @param {number} mealTotal
 * @param {number} mobilization
 * @param {number} discount
 * @returns {number} Subtotal
 */
export const calculateSubtotal = (trainingTotal, mealTotal, mobilization, discount) =>
  trainingTotal + mealTotal + mobilization - discount

/**
 * Calculate SST amount
 * @param {number} subtotal
 * @param {number} sstRate - Percentage (e.g., 6 for 6%)
 * @returns {number}
 */
export const calculateSST = (subtotal, sstRate) => subtotal * (sstRate / 100)

/**
 * Calculate HRD levy charge
 * @param {number} trainingTotal
 * @param {number} discount
 * @param {number} hrdRate - Percentage (e.g., 4 for 4%)
 * @returns {number}
 */
export const calculateHRD = (trainingTotal, discount, hrdRate) =>
  Math.max(Number(trainingTotal || 0) - Number(discount || 0), 0) *
  (Math.max(Number(hrdRate || 0), 0) / 100)

/**
 * Calculate grand total payable
 * @param {number} subtotal
 * @param {number} sstAmount
 * @param {number} hrdAmount
 * @returns {number}
 */
export const calculateGrandTotal = (subtotal, sstAmount, hrdAmount) =>
  subtotal + sstAmount + hrdAmount
