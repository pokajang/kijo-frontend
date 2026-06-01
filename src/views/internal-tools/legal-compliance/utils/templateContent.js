import { defaultClauseFields } from '../legalComplianceTemplateData'
import { ensureDefaultClauseFields, normalizeDraftContent } from '../legalComplianceTemplateUtils'

export const getTemplateSections = (content) =>
  Array.isArray(content?.groups) ? content.groups : []

export const getLegalGroupLetter = (index = 0) => {
  let value = Number(index) + 1
  let label = ''

  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }

  return label || 'A'
}

export const formatLegalGroupTitle = (group = {}, index = 0) =>
  `${getLegalGroupLetter(index)}. ${group.title || 'Legislation name not set'}`

export const getClauseFields = (clause) =>
  ensureDefaultClauseFields(
    Array.isArray(clause?.fields) && clause.fields.length > 0 ? clause.fields : defaultClauseFields,
  )

export { ensureDefaultClauseFields, normalizeDraftContent }

export const createEmptyClauseResponses = (sections) =>
  sections
    .flatMap((section) => section.clauses || [])
    .reduce((responses, clause) => {
      responses[clause.id] = getClauseFields(clause).reduce((fieldResponses, field) => {
        fieldResponses[field.key] = ''
        return fieldResponses
      }, {})
      return responses
    }, {})

export const createClauseResponses = (savedResponses = {}, sections = []) => {
  const emptyResponses = createEmptyClauseResponses(sections)

  return Object.keys(emptyResponses).reduce(
    (responses, clauseId) => {
      responses[clauseId] = {
        ...emptyResponses[clauseId],
        ...(savedResponses?.[clauseId] || {}),
      }
      return responses
    },
    { ...(savedResponses || {}) },
  )
}

export const isRequiredFieldComplete = (field, response = {}) =>
  !field.required || String(response[field.key] || '').trim() !== ''

export const getSectionProgress = (section = {}, clauseResponses = {}) => {
  const clauses = section.clauses || []
  const completed = clauses.filter((clause) => {
    const response = clauseResponses[clause.id] || {}
    const requiredFields = getClauseFields(clause).filter((field) => field.required)
    if (requiredFields.length === 0) return false

    return requiredFields.every((field) => isRequiredFieldComplete(field, response))
  }).length
  const comply = clauses.filter(
    (clause) => clauseResponses[clause.id]?.complianceStatus === 'comply',
  ).length
  const notComply = clauses.filter(
    (clause) => clauseResponses[clause.id]?.complianceStatus === 'not_comply',
  ).length

  return {
    total: clauses.length,
    completed,
    comply,
    notComply,
    missing: Math.max(clauses.length - completed, 0),
  }
}

export const getAssessmentProgress = (sections = [], clauseResponses = {}) =>
  sections.reduce(
    (summary, section) => {
      const progress = getSectionProgress(section, clauseResponses)
      return {
        total: summary.total + progress.total,
        completed: summary.completed + progress.completed,
        comply: summary.comply + progress.comply,
        notComply: summary.notComply + progress.notComply,
        missing: summary.missing + progress.missing,
      }
    },
    { total: 0, completed: 0, comply: 0, notComply: 0, missing: 0 },
  )

export const hasClauseFindingOrIssue = (clause = {}, response = {}) => {
  const hasFinding = getClauseFields(clause).some(
    (field) => field.key !== 'complianceStatus' && String(response[field.key] || '').trim() !== '',
  )
  const hasMissingRequired = getClauseFields(clause).some(
    (field) => !isRequiredFieldComplete(field, response),
  )

  return response.complianceStatus === 'not_comply' || hasFinding || hasMissingRequired
}
