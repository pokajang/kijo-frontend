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
} from './templateUtils'
import {
  API_BASE,
  getTemplateBaseUrl,
  getTemplatePdfUrl as buildTemplatePdfUrl,
  getTemplateWordUrl as buildTemplateWordUrl,
  getTemplateResourceUrl,
} from './templateApi'
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

export const templateConfigs = {
  ih: {
    listPath: getProposalListPath('ih'),
    listTitle: 'Industrial Hygiene Proposal Templates',
    detailTitle: 'Industrial Hygiene Proposal Details',
    listApi: getTemplateBaseUrl('ih'),
    deleteUrl: (id) => getTemplateResourceUrl('ih', id),
    pdfUrl: (id) => buildTemplatePdfUrl('ih', id),
    editUrl: (id) => `/templates/create?type=ih&edit=true&id=${id}`,
    exportLabel: 'Export Brochure',
    storageKey: 'templates.ih.visible-columns.v3',
    idPrefix: 'ih-template',
    filePrefix: 'ih-templates',
    titleFallback: 'Industrial Hygiene Proposal',
    sections: [
      ['Introduction', 'introduction'],
      ['Objectives', 'objectives'],
      ['Scope of Work', 'workScope'],
      ['Project Schedule', 'schedule'],
      ['Reference', 'reference'],
      ['Other Information', 'otherFields'],
    ],
  },
  manpower: {
    listPath: getProposalListPath('manpower'),
    listTitle: 'Manpower Proposal Templates',
    detailTitle: 'Manpower Proposal Details',
    listApi: getTemplateBaseUrl('manpower'),
    deleteUrl: (id) => getTemplateResourceUrl('manpower', id),
    pdfUrl: (id) => buildTemplatePdfUrl('manpower', id),
    editUrl: (id) => `/templates/create?type=manpower&edit=true&id=${id}`,
    exportLabel: 'Export Proposal',
    storageKey: 'templates.manpower.visible-columns.v3',
    idPrefix: 'manpower-template',
    filePrefix: 'manpower-templates',
    titleFallback: 'Manpower Proposal',
    sections: [
      ['Introduction', 'introduction'],
      ['Service Deliverables', 'serviceDeliverables'],
      ['Supplied Manpower Deliverables', 'suppliedManpowerDeliverables'],
      ['Custom Section', 'customSection'],
    ],
  },
  special: {
    listPath: getProposalListPath('special'),
    listTitle: 'Special Service Proposal Templates',
    detailTitle: 'Special Service Proposal Details',
    listApi: getTemplateBaseUrl('special'),
    deleteUrl: (id) => getTemplateResourceUrl('special', id),
    pdfUrl: (id) => buildTemplatePdfUrl('special', id),
    editUrl: (id) => `/templates/create?type=special&edit=true&id=${id}`,
    exportLabel: 'Export Proposal',
    storageKey: 'templates.special.visible-columns.v3',
    idPrefix: 'special-template',
    filePrefix: 'special-templates',
    titleFallback: 'Special Proposal',
    hasAttachments: true,
    sections: [
      ['Internal Service Summary', 'serviceSummary'],
      ['Written Proposal Content', 'proposalContent'],
    ],
  },
}

const getDescriptionSource = (row, type) => {
  if (type === 'special') {
    const proposalMode = row?.proposalMode || row?.proposal_mode
    return proposalMode === 'write'
      ? row?.proposalContent || row?.proposal_content || row?.content || ''
      : row?.serviceSummary || row?.service_summary || row?.content || ''
  }
  return row?.introduction || ''
}

export const normalizeTemplateRow = (row, type) => {
  const templateId = getTemplateId(row)
  const title = row?.serviceTitle || row?.ihTitle || row?.trainingTitle || '-'
  const serviceCode = row?.serviceCode || row?.trainingCode || '-'
  const history = Array.isArray(row?.history) ? row.history : []
  const createdHistory = history.length ? history[history.length - 1] : null

  return {
    ...row,
    id: templateId || row?.id,
    templateId,
    title,
    serviceCode,
    proposalLanguage: row?.proposalLanguage || row?.proposal_language || 'en',
    sourceTemplateId: row?.sourceTemplateId || row?.source_template_id || null,
    hasBmCopy: Boolean(row?.hasBmCopy),
    bmTemplateId: row?.bmTemplateId || null,
    translationStatus: row?.translationStatus || row?.translation_status || null,
    translationNotes: row?.translationNotes || row?.translation_notes || null,
    description: stripHtml(getDescriptionSource(row, type)),
    dateCreatedRaw: row?.dateCreated || row?.created_at || '',
    dateCreated: formatTemplateDate(row?.dateCreated || row?.created_at),
    createdBy: row?.createdBy || createdHistory?.created_by_code || '-',
    attachmentsCount: Array.isArray(row?.attachments) ? row.attachments.length : 0,
  }
}

export const getTemplatePdfUrl = (type, templateId) => templateConfigs[type].pdfUrl(templateId)

export const getTemplateWordUrl = (type, templateId) => buildTemplateWordUrl(type, templateId)
