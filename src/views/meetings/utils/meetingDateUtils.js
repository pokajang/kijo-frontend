export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export const toDateOnlyValue = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const toDateTimeLocalValue = (value) => {
  const normalized = String(value || '').replace(' ', 'T')
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
}
