export const toNumber = (value, fallback = 0) => {
  const num = parseFloat(value)
  return Number.isFinite(num) ? num : fallback
}
