import {
  createPipelineEntryRowId,
  entryTypeAllowsEstimatedRm,
  normalizeClassificationType,
  todayISO,
} from '../../marketing/pipeline/pipelineEntryUtils'

export const createBlankManualEntryRow = () => ({
  rowId: createPipelineEntryRowId(),
  prospect_name: '',
  service_category: '',
  custom_service_category: '',
  estimated_rm: '',
  notes: '',
  photoFile: null,
})

export const buildManualEntryRow = (entry, form) => ({
  rowId: entry.rowId || createPipelineEntryRowId(),
  entry_type: entry.entry_type || form.entry_type,
  entry_date: entry.entry_date || form.entry_date,
  source: entry.source || form.source,
  segment_type: normalizeClassificationType(entry.segment_type ?? form.segment_type),
  service_category: entry.service_category || '',
  custom_service_category: entry.custom_service_category || '',
  estimated_rm:
    entryTypeAllowsEstimatedRm(entry.entry_type || form.entry_type) &&
    entry.estimated_rm !== '' &&
    entry.estimated_rm !== null
      ? entry.estimated_rm
      : '',
  prospect_name: entry.prospect_name.trim(),
  notes: entry.notes.trim(),
  photoFile: entry.photoFile || null,
})

export const getDefaultManualEntryDate = (startDate, endDate) => {
  const today = todayISO()
  if (startDate && today < startDate) return startDate
  if (endDate && today > endDate) return endDate
  return today
}
