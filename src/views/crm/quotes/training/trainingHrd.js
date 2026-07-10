export const DEFAULT_HRD_CHARGE_RATE = 4

export const isHrdGrantPayment = (paymentMethod) =>
  String(paymentMethod || '')
    .trim()
    .toLowerCase() === 'hrd grant'

export const normalizeTrainingHrdCharge = (paymentMethod, hrdCharge) => {
  if (!isHrdGrantPayment(paymentMethod)) return 0

  const parsed = Number(hrdCharge)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HRD_CHARGE_RATE
}
