import {
  DEFAULT_VISIBLE_COLUMNS,
  REQUIRED_COLUMNS,
  SERVICE_LABELS,
} from '../config/allRecordsTableConfig'
import { getSpecialRecordServiceLabel } from './specialRecordCategories'

const BOOLEAN_FALSE_VALUES = new Set(['false', '0', 'no', 'off'])
const BOOLEAN_TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])

export const decodeHtmlEntities = (value = '') =>
  String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

export const getServiceLabel = (record) =>
  record?.serviceTab === 'special-tab'
    ? getSpecialRecordServiceLabel(record)
    : SERVICE_LABELS[record?.serviceTab] || 'Unknown'

export const getAmountValue = (record) => Number(record?.amount ?? record?.grandTotal ?? 0)
export const getCreatedTime = (record) => Date.parse(record?.dateCreated || 0)

export const getStatusTone = (status) => {
  if (status === 'Awarded') return 'success'
  if (status === 'Failed') return 'danger'
  if (status === 'Terminated') return 'dark'
  return 'info'
}

export const getProjectStatusCounts = (record) => {
  const counts = record?.projectStatusCounts || record?.project_status_counts || {}
  return {
    active: Number(counts.active || 0),
    completed: Number(counts.completed || 0),
    terminated: Number(counts.terminated || 0),
    total: Number(counts.total || 0),
  }
}

export const isAwardedWithAllProjectsTerminated = (record) => {
  if (record?.status !== 'Awarded') return false
  const counts = getProjectStatusCounts(record)
  return counts.total > 0 && counts.terminated === counts.total
}

export const getProjectOutcomeLabel = (record) => {
  if (record?.status !== 'Awarded') return ''
  const counts = getProjectStatusCounts(record)
  if (counts.total <= 0 || counts.terminated <= 0) return ''
  if (counts.terminated === counts.total) return 'Projects Terminated'

  const parts = []
  if (counts.active > 0) parts.push(`Active ${counts.active}`)
  if (counts.completed > 0) parts.push(`Completed ${counts.completed}`)
  if (counts.terminated > 0) parts.push(`Terminated ${counts.terminated}`)
  return parts.length ? `Projects: ${parts.join(' / ')}` : ''
}

export const getStatusLabel = (record) =>
  isAwardedWithAllProjectsTerminated(record)
    ? 'Awarded - Projects Terminated'
    : record?.status === 'Awarded' && Number(record?.awardCount ?? 0) > 1
      ? `Awarded (x${Number(record.awardCount)})`
      : record?.status || '-'

export const getInitialPageSize = () => {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 991.98px)').matches) {
    return 5
  }
  return 10
}

export const truncateFront = (value, keep = 11) => {
  const text = String(value || '')
  if (!text) return '-'
  if (text.length <= keep) return text
  return `...${text.slice(-keep)}`
}

export const escapeCsvValue = (value) => {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const getSubject = (record) => {
  const formData = record?.formData || {}

  if (formData.trainingTopic) {
    const duration = Number(formData.trainingDuration)
    const durationUnit = String(formData.durationUnit || 'day').trim()
    if (Number.isFinite(duration) && duration > 0) {
      return `${formData.trainingTopic} - ${duration} ${durationUnit}`
    }
    return formData.trainingTopic
  }

  if (formData.serviceTitle) {
    if (record?.serviceTab === 'manpower-tab') {
      const pax = Number(formData.noOfPax)
      const isHourly = formData.billingUnit === 'hour'
      const duration = Number(isHourly ? formData.durationHours : formData.durationMonths)
      const parts = []
      if (Number.isFinite(pax) && pax > 0) parts.push(`${pax} pax`)
      if (Number.isFinite(duration) && duration > 0)
        parts.push(`${duration} ${isHourly ? 'hr' : 'mth'}`)
      if (parts.length) return `${decodeHtmlEntities(formData.serviceTitle)} - ${parts.join(' ')}`
    }
    return decodeHtmlEntities(formData.serviceTitle)
  }

  if (Array.isArray(record?.lineItems) && record.lineItems.length > 0) {
    const first = record.lineItems[0]
    return decodeHtmlEntities(first?.itemName || first?.title || first?.description || '-')
  }

  if (formData.inquiryRemarks) return decodeHtmlEntities(formData.inquiryRemarks)
  return '-'
}

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

export const normalizeVisibleColumns = (value) => {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const normalized = {}

  Object.keys(DEFAULT_VISIBLE_COLUMNS).forEach((key) => {
    normalized[key] = coerceBoolean(input[key], true)
  })

  REQUIRED_COLUMNS.forEach((key) => {
    normalized[key] = true
  })

  return normalized
}

export const getPrimaryRemarkText = (record, fmtDate) => {
  const awardHistory = Array.isArray(record?.awardHistory) ? record.awardHistory : []
  if (awardHistory.length > 0) {
    const latest = awardHistory[0]
    const label = awardHistory.length > 1 ? 'Re-Awarded' : 'Awarded'
    return `${latest?.awardDate || fmtDate(latest?.createdAt) || '-'} ${label}`.trim()
  }

  const primary = String(record?.statusRemarks || '').trim()
  if (primary && primary.toLowerCase() !== 'pending') {
    const stamp = fmtDate(record?.dateUpdated || record?.dateCreated) || '-'
    return `${stamp} ${primary}`.trim()
  }

  const followUps = Array.isArray(record?.followUps) ? record.followUps : []
  if (followUps.length > 0) {
    const latestFollowUp = followUps[0]
    return `${latestFollowUp?.followUpDate || '-'} ${String(latestFollowUp?.remarks || '').trim()}`.trim()
  }

  return 'Pending'
}
