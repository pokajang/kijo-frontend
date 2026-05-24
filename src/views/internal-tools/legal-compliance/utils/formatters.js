export const stageLabels = {
  details_saved: 'Details Saved',
  review_ready: 'Review Ready',
  submitted: 'Submitted',
}

export const stageTones = {
  details_saved: 'secondary',
  review_ready: 'info',
  submitted: 'success',
}

export const displayValue = (value) => value || '-'

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

const createLocalDateFromDateOnly = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const formatDate = (value) => {
  if (!value) return '-'
  const date = dateOnlyPattern.test(value) ? createLocalDateFromDateOnly(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getStageLabel = (stage) => stageLabels[stage] || displayValue(stage)

export const getStageTone = (stage) => stageTones[stage] || 'secondary'

export const getCompletedTotal = (record) => record.total_clause_count ?? record.total_clauses ?? 0

export const getCompletedCount = (record) => record.completed_count ?? record.finding_count ?? 0

export const getCompletedDisplay = (record) =>
  `${getCompletedCount(record)}/${getCompletedTotal(record)}`

export const getTemplateDisplay = (record) => {
  if (!record.template_name && !record.template_version && !record.published_version_number) {
    return '-'
  }

  const name = displayValue(record.template_name)
  const version = record.published_version_number
    ? `Version ${record.published_version_number}`
    : displayValue(record.template_version)

  return `${name} ${version}`.trim()
}
