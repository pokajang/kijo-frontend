import {
  formatTemplateDate,
  buildBmCopyConfirmation,
  buildExistingBmCopyConfirmation,
  attachBmCopyLinks,
  getTemplateId,
  getSourceTemplateId,
  isBmTemplate,
  isMachineDraftBmTemplate,
  isSuccess,
  normalizeTemplateLanguage,
  sanitizeDisplayHtml,
  stripHtml,
  unwrapRows,
} from '../shared/templateUtils'
import {
  API_BASE,
  getTemplateBaseUrl,
  getTemplatePdfUrl as buildTemplatePdfUrl,
  getTemplateWordUrl as buildTemplateWordUrl,
} from '../shared/templateApi'
import { getProposalListPath } from '../proposals/proposalTabs'

export {
  formatTemplateDate,
  buildBmCopyConfirmation,
  buildExistingBmCopyConfirmation,
  attachBmCopyLinks,
  getTemplateId,
  getSourceTemplateId,
  isBmTemplate,
  isMachineDraftBmTemplate,
  isSuccess,
  normalizeTemplateLanguage,
  sanitizeDisplayHtml,
  stripHtml,
  unwrapRows,
}

export { API_BASE }

export const TRAINING_LIST_PATH = getProposalListPath('training')

export const TRAINING_API = getTemplateBaseUrl('training')

export const inferDurationTokenFromAgenda = (agenda) => {
  if (!Array.isArray(agenda) || agenda.length === 0) return ''
  const maxDay = Math.max(...agenda.map((item) => Number(item?.day) || 1))
  return maxDay >= 3 ? '3day' : maxDay === 2 ? '2day' : '1day'
}

export const formatDurationLabel = (raw) => {
  const token = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const match = token.match(/^(\d+)\s*hour$/)
  if (match) {
    const hours = parseInt(match[1], 10)
    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`
  }
  switch (token) {
    case 'halfday_am':
    case 'halfday_pm':
      return 'Half Day (4 hours)'
    case '1day':
    case 'full_day':
      return '1 Day'
    case '2day':
      return '2 Days'
    case '3day':
      return '3 Days'
    default:
      return token ? token.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : ''
  }
}

export const buildTrainingTitle = (row) => row?.trainingTitle || row?.serviceTitle || '-'

export const buildTrainingDisplayTitle = (row) => {
  const title = buildTrainingTitle(row)
  const codePart = row?.trainingCode ? ` (${row.trainingCode})` : ''
  const durationLabel = row?.durationLabel || formatDurationLabel(row?.duration)
  return durationLabel ? `${title}${codePart} - ${durationLabel}` : `${title}${codePart}`
}

export const normalizeTrainingTemplateRow = (row) => {
  const templateId = getTemplateId(row)
  const durationToken = row?.duration || inferDurationTokenFromAgenda(row?.agenda)
  const durationLabel = formatDurationLabel(durationToken)
  const title = buildTrainingTitle(row)
  const history = Array.isArray(row?.history) ? row.history : []
  const createdHistory = history.length ? history[history.length - 1] : null
  const latestHistory = history[0] || null

  return {
    ...row,
    id: templateId || row?.id,
    templateId,
    title,
    displayTitle: buildTrainingDisplayTitle({ ...row, durationLabel }),
    trainingCode: row?.trainingCode || '-',
    proposalLanguage: row?.proposalLanguage || row?.proposal_language || 'en',
    sourceTemplateId: row?.sourceTemplateId || row?.source_template_id || null,
    hasBmCopy: Boolean(row?.hasBmCopy),
    bmTemplateId: row?.bmTemplateId || null,
    translationStatus: row?.translationStatus || row?.translation_status || null,
    translationNotes: row?.translationNotes || row?.translation_notes || null,
    hrdNo: row?.hrdNo || '-',
    durationLabel: durationLabel || '-',
    description: stripHtml(row?.introduction || ''),
    dateCreatedRaw: row?.dateCreated || row?.created_at || '',
    dateCreated: formatTemplateDate(row?.dateCreated || row?.created_at),
    createdBy: row?.createdBy || createdHistory?.created_by_code || '-',
    editedBy: latestHistory?.created_by_code || '-',
  }
}

export const getTrainingPdfUrl = (templateId) => buildTemplatePdfUrl('training', templateId)

export const getTrainingWordUrl = (templateId) => buildTemplateWordUrl('training', templateId)

export const getTrainingEditUrl = (templateId) =>
  `/templates/create?type=training&edit=true&id=${templateId}`
