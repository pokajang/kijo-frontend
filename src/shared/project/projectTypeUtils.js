export const normalizeProjectType = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

export const isSpecialProjectType = (value) => {
  const normalized = normalizeProjectType(value)
  return normalized === 'special' || normalized === 'special service'
}
