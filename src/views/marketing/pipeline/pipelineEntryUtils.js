import { inquirySourceValues } from '../../../features/client-origin/sourceCatalog'

export const API_BASE = import.meta.env.VITE_API_BASE
export const MAX_PROOF_IMAGE_BYTES = 500 * 1024

const apiPath = (path) => `${API_BASE || '/'}${String(path).replace(/^\/+/, '')}`

export const getPipelineEntryPhotoUrl = (entry) => {
  if (!entry?.photoUrl) return ''
  if (entry.photoUrl.startsWith('data:image/') || entry.photoUrl.startsWith('blob:')) {
    return entry.photoUrl
  }
  if (!entry.id) return entry.photoUrl

  return apiPath(`stats/monitoring-manual-pipeline-entry/${encodeURIComponent(entry.id)}/photo`)
}

export const entryTypes = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'meeting_pitching', label: 'Meeting/ Pitching' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed', label: 'Closed' },
]
export const entryTypeValues = entryTypes.map((type) => type.value)
export const entryTypeAllowsEstimatedRm = (entryType) => ['proposal', 'closed'].includes(entryType)
export const legalComplianceAssessmentSource = 'Free Legal Compliance Assessment'

export const entrySources = [legalComplianceAssessmentSource, ...inquirySourceValues]
export const entrySourceOptions = entrySources.map((source) => ({
  label: source,
  value: source,
}))
export const defaultEntrySource = 'WhatsApp Personal'
export const classificationTypes = [
  { value: '', label: 'None' },
  { value: 'special_project', label: 'Special Project' },
  { value: 'tender', label: 'Tender' },
]
export const serviceCategories = [
  { value: '', label: 'Not classified' },
  { value: 'training', label: 'Training' },
  { value: 'consultancy_iso', label: 'Consultancy - ISO' },
  { value: 'consultancy_ihoh', label: 'Consultancy - IHOH' },
  { value: 'consultancy_osh', label: 'Consultancy - OSH' },
  { value: 'man_power', label: 'Man Power' },
  { value: 'equipment_supply', label: 'Equipment Supply' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'other', label: 'Others' },
]
export const serviceCategoryLabel = (value, fallback = 'Not classified') =>
  serviceCategories.find((service) => service.value === (value || ''))?.label || fallback
export const isOtherServiceCategory = (value) => value === 'other'
export const serviceCategoryDisplayLabel = (value, customValue, fallback = 'Not classified') => {
  const label = serviceCategoryLabel(value, fallback)
  if (!isOtherServiceCategory(value)) return label

  const customLabel = String(customValue || '').trim()
  return customLabel ? `${label} — ${customLabel}` : label
}
export const serviceCategoryValues = serviceCategories
  .map((service) => service.value)
  .filter((value) => value !== '')
export const pageSizeOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]

export const normalizeClassificationType = (value) => {
  const nextValue = value || ''
  return nextValue === 'individual' ? '' : nextValue
}

export const classificationLabel = (value, fallback = 'None') =>
  classificationTypes.find(
    (classification) => classification.value === normalizeClassificationType(value),
  )?.label || fallback

export const formatLocalISODate = (date) => {
  const nextDate = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(nextDate.getTime())) return ''

  const year = nextDate.getFullYear()
  const month = String(nextDate.getMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayISO = () => formatLocalISODate(new Date())

export const monthStartISO = () => {
  const date = new Date()
  date.setDate(1)
  return formatLocalISODate(date)
}

export const createPipelineEntryRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const createBlankEntryRow = () => ({
  rowId: createPipelineEntryRowId(),
  entry_type: 'lead',
  entry_date: todayISO(),
  source: defaultEntrySource,
  segment_type: '',
  service_category: '',
  custom_service_category: '',
  estimated_rm: '',
  prospect_name: '',
  notes: '',
  photoFile: null,
  photoInputKey: 0,
})

export const hasInvalidEstimatedRm = (value) =>
  value !== '' &&
  value !== null &&
  value !== undefined &&
  (!Number.isFinite(Number(value)) || Number(value) < 0)

export const getPipelineEntryValidationError = (
  entry,
  {
    requireProspect = true,
    requireCoreFields = true,
    requireClosedRevenueFields = true,
    prospectLabel = 'Prospect name',
  } = {},
) => {
  const entryType = entry?.entry_type || ''
  const estimatedRm = entry?.estimated_rm

  if (requireProspect && !String(entry?.prospect_name || '').trim()) {
    return `${prospectLabel} is required.`
  }

  if (requireCoreFields) {
    if (!entryTypeValues.includes(entryType)) {
      return 'Entry type is required.'
    }

    if (!entry?.entry_date) {
      return 'Entry date is required.'
    }

    if (!String(entry?.source || '').trim()) {
      return 'Source is required.'
    }
  }

  if (hasInvalidEstimatedRm(estimatedRm)) {
    return 'Estimated RM must be zero or more.'
  }

  if (
    isOtherServiceCategory(entry?.service_category) &&
    !String(entry?.custom_service_category || '').trim()
  ) {
    return 'Specify the service category when Others is selected.'
  }

  if (requireClosedRevenueFields && entryType === 'closed') {
    if (!serviceCategoryValues.includes(entry?.service_category || '')) {
      return 'Closed manual entries require a service category.'
    }

    const amount = Number(estimatedRm)
    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Closed manual entries require Estimated RM greater than zero.'
    }
  }

  return ''
}

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })

export const compressProofImage = async (file) => {
  if (!file || file.size <= MAX_PROOF_IMAGE_BYTES || !file.type.startsWith('image/')) {
    return file
  }

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = imageUrl

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
    })

    let maxDimension = 1600
    let blob = null

    while (maxDimension >= 800) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))

      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      let quality = 0.82
      blob = await canvasToBlob(canvas, 'image/jpeg', quality)

      while (blob && blob.size > MAX_PROOF_IMAGE_BYTES && quality > 0.48) {
        quality -= 0.08
        blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      }

      if (!blob || blob.size <= MAX_PROOF_IMAGE_BYTES) {
        break
      }

      maxDimension -= 200
    }

    if (!blob || blob.size >= file.size) {
      return file
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'screenshot-proof'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export const formatDate = (dateValue) => {
  if (!dateValue) return '-'
  const rawValue = String(dateValue).trim()
  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDateMatch) return isoDateMatch[1]

  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) return dateValue

  return formatLocalISODate(date)
}

export const typeLabel = (value) =>
  entryTypes.find((type) => type.value === value)?.label || value || '-'

export const typeBadgeClass = (value) => {
  if (value === 'closed') return 'records-status-badge records-status-badge--success'
  if (value === 'negotiation') return 'records-status-badge records-status-badge--info'
  if (value === 'proposal') return 'records-status-badge records-status-badge--dark'
  return 'records-status-badge'
}

export const normalizeBulkRow = (row) => ({
  ...row,
  entry_type: row.entry_type,
  entry_date: row.entry_date,
  source: row.source.trim(),
  segment_type: normalizeClassificationType(row.segment_type),
  service_category: row.service_category || '',
  custom_service_category: isOtherServiceCategory(row.service_category)
    ? String(row.custom_service_category || '').trim()
    : '',
  estimated_rm:
    entryTypeAllowsEstimatedRm(row.entry_type) &&
    row.estimated_rm !== '' &&
    row.estimated_rm !== null
      ? row.estimated_rm
      : '',
  prospect_name: row.prospect_name.trim(),
  notes: row.notes.trim(),
  photoFile: row.photoFile || null,
})

export const chunkRows = (rows, size) => {
  const chunks = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}

export const headerCellStyle = {
  backgroundColor: 'var(--app-surface-subtle)',
  borderBottom: '1px solid var(--app-border)',
  fontWeight: 600,
}
