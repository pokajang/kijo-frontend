export const escapeCsvValue = (value) => {
  const raw = String(value ?? '')
  const text = /^[=+\-@]/.test(raw.trimStart()) ? `\t${raw}` : raw
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const buildCsv = ({ rows = [], columns = [], includeIndex = true }) => {
  const headers = includeIndex
    ? ['#', ...columns.map((column) => column.label)]
    : columns.map((column) => column.label)
  const lines = [headers.map(escapeCsvValue).join(',')]

  rows.forEach((row, index) => {
    const values = columns.map((column) =>
      typeof column.getValue === 'function' ? column.getValue(row) : row?.[column.key],
    )
    lines.push((includeIndex ? [index + 1, ...values] : values).map(escapeCsvValue).join(','))
  })

  return lines.join('\n')
}

export const downloadCsv = (filename, csvText) => {
  const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
