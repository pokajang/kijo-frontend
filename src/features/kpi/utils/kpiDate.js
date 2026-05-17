export function getMonthIndex(forMonth) {
  const match = String(forMonth || '').match(/^\d{4}-(\d{2})(?:-\d{2})?/)
  if (!match) return -1

  const month = Number(match[1])
  return month >= 1 && month <= 12 ? month - 1 : -1
}

export function trackerBelongsToKpi(row, kpi) {
  if (row?.kpi_id != null) {
    return String(row.kpi_id) === String(kpi.value ?? kpi.id)
  }

  return row?.label === kpi.label
}
