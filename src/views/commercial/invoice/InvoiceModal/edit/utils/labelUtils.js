export const normalizeDesc = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const normalizeLabel = (value) => {
  const raw = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) return ''
  const parts = raw.split(' ')
  if (parts[parts.length - 1] === 'rm') {
    parts.pop()
  }
  return parts.join(' ')
}

export const isExactLabel = (line, labels) => {
  const normalized = normalizeLabel(line?.item_description)
  if (!normalized) return false
  return labels.some((label) => normalized === normalizeLabel(label))
}

export const buildHygieneBaseLabel = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'Industrial Hygiene'
  const parts = raw.split(/\s+at\s+/i)
  return (parts[0] || raw).trim() || 'Industrial Hygiene'
}
