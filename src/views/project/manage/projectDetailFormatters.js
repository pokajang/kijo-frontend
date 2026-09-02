import { getLatestProgressUpdate } from './projectFilters'
import { formatMoney } from '../../../utils/formatters/numberFormatters'

const emptyValue = '-'

const getDateOnlyText = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (text.includes('T')) return text.split('T')[0]
  if (text.includes(' ')) return text.split(' ')[0]
  return text
}

const parseDateOnlyParts = (value) => {
  const dateOnly = getDateOnlyText(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly)
  if (!match) return null

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return { year, month, day }
}

export const formatProjectDate = (value) => getDateOnlyText(value) || emptyValue

export const formatProjectDateTime = (value) => {
  if (!value) return emptyValue
  const text = String(value).trim()
  if (!text) return emptyValue

  const normalized = text.replace('T', ' ')
  return normalized.slice(0, 19)
}

export const formatProjectDateTimeParts = (value) => {
  const formatted = formatProjectDateTime(value)
  if (formatted === emptyValue) return { date: emptyValue, time: emptyValue }

  const [date = emptyValue, time = emptyValue] = formatted.split(' ')
  if (!parseDateOnlyParts(date)) return { date: emptyValue, time: emptyValue }

  return { date: date || emptyValue, time: time || emptyValue }
}

export const formatProjectMoney = (value) => {
  if (value === '' || value == null) return emptyValue

  const normalizedValue =
    typeof value === 'string' ? value.replace(/^RM\s*/i, '').replace(/,/g, '') : value
  const amount = Number(normalizedValue)
  if (!Number.isFinite(amount)) return emptyValue

  return formatMoney(amount, { fallback: emptyValue })
}

export const formatProjectDeltaDays = (value) => {
  if (value == null || value === '') return emptyValue
  const days = Number(value)
  if (!Number.isFinite(days)) return emptyValue
  if (days > 0) return `+${days}d`
  return `${days}d`
}

export const formatProjectCumulativeDays = (value) => {
  if (value == null || value === '') return 'Cum. -'
  const days = Number(value)
  if (!Number.isFinite(days)) return 'Cum. -'
  return `Cum. ${days}d`
}

export const formatProjectDurationDays = (start, end) => {
  const startParts = parseDateOnlyParts(start)
  const endParts = parseDateOnlyParts(end)
  if (!startParts || !endParts) return emptyValue

  const startTime = Date.UTC(startParts.year, startParts.month - 1, startParts.day)
  const endTime = Date.UTC(endParts.year, endParts.month - 1, endParts.day)
  const diffDays = Math.round((endTime - startTime) / 86400000)

  if (diffDays < 0) return emptyValue
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
}

export const getProjectLeader = (project = {}) => {
  const collaborators = Array.isArray(project?.assigned_staff) ? project.assigned_staff : []
  const leader = collaborators.find((staff) => staff?.project_role === 'Leader')
  if (!leader) return emptyValue

  const name = leader.full_name || leader.name || ''
  const code = leader.name_code || leader.code || ''
  if (name && code) return `${name} (${code})`
  return name || code || emptyValue
}

export const getProjectLatestUpdate = (project = {}) => {
  const latest = getLatestProgressUpdate(project)
  return formatProjectDate(latest?.progress_date || latest?.updated_on)
}
