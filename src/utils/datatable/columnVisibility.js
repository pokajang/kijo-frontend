const BOOLEAN_FALSE_VALUES = new Set(['false', '0', 'no', 'off'])
const BOOLEAN_TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])

export const coerceBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (BOOLEAN_FALSE_VALUES.has(normalized)) return false
    if (BOOLEAN_TRUE_VALUES.has(normalized)) return true
  }
  return Boolean(value)
}

export const normalizeVisibleColumns = (
  value,
  defaultVisibleColumns = {},
  requiredColumns = new Set(),
) => {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const normalized = {}

  Object.keys(defaultVisibleColumns).forEach((key) => {
    normalized[key] = coerceBoolean(input[key], coerceBoolean(defaultVisibleColumns[key], true))
  })

  requiredColumns.forEach((key) => {
    normalized[key] = true
  })

  return normalized
}

export const getVisibleColumns = (columns = [], isColumnVisible = () => true) =>
  columns.filter((column) => isColumnVisible(column.key || column))
