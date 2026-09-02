const pad = (value) => String(value).padStart(2, '0')

export const toLocalDateInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const toLocalMonthInputValue = (value = new Date()) =>
  toLocalDateInputValue(value).slice(0, 7)
