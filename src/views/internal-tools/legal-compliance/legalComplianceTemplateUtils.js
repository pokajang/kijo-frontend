import { listLegalComplianceTemplates } from './api/legalComplianceApi'

export const ASSESSMENT_TIERS = {
  free: {
    value: 'free',
    label: 'Free Assessment',
    badge: 'Free',
    reportTitle: 'Free Legal Compliance Assessment Report',
    disclaimer:
      'This free assessment report is provided as a preliminary compliance review based on the information available during the assessment. It does not constitute legal advice or a full statutory audit. Further verification may be required before relying on this report for regulatory, contractual, or enforcement purposes.',
  },
  paid: {
    value: 'paid',
    label: 'Paid Assessment',
    badge: 'Paid',
    reportTitle: 'Occupational Safety and Health Legal Compliance Assessment Report',
    disclaimer:
      "This report presents the findings of a legal compliance assessment based on the scope, information, documents, and site observations available at the time of assessment. It reflects the assessor's professional opinion on the applicable requirements reviewed and does not constitute legal advice or a regulatory determination.",
  },
}

export const normalizeAssessmentTier = (value) =>
  Object.prototype.hasOwnProperty.call(ASSESSMENT_TIERS, value) ? value : 'free'

export const getAssessmentTierMeta = (value) => ASSESSMENT_TIERS[normalizeAssessmentTier(value)]

export const getDefaultReportTitle = (name = '', tier = 'free') => {
  const trimmedName = String(name || '').trim()
  if (
    normalizeAssessmentTier(tier) === 'free' &&
    trimmedName === 'Free Legal Compliance Assessment'
  ) {
    return ASSESSMENT_TIERS.free.reportTitle
  }
  if (normalizeAssessmentTier(tier) === 'paid') {
    return ASSESSMENT_TIERS.paid.reportTitle
  }
  return trimmedName ? `${trimmedName} Report` : ASSESSMENT_TIERS.free.reportTitle
}

export const getDefaultDisclaimerText = (tier = 'free') => getAssessmentTierMeta(tier).disclaimer

export const createId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const createTemplateSlug = (name = '') => {
  const slug = name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'template'
}

export const getTemplateRouteKey = (template = {}, fallback = '') =>
  template?.slug || createTemplateSlug(template?.name || fallback)

export const getGroupRouteKey = (group = {}, fallback = '') =>
  group?.id || createTemplateSlug(fallback)

export const resolveTemplateIdFromRouteKey = async (routeKey) => {
  if (!routeKey) return null
  if (/^\d+$/.test(routeKey)) return routeKey

  const payload = await listLegalComplianceTemplates()

  const templates = Array.isArray(payload.templates) ? payload.templates : []
  const decodedRouteKey = decodeURIComponent(routeKey)
  const exactSlugMatch = templates.find(
    (template) => template.slug === routeKey || template.slug === decodedRouteKey,
  )
  const exactNameMatch = templates.find((template) => template.name === decodedRouteKey)
  const legacyDefaultMatch =
    ['osh-legal-compliance-assessment', 'osh-legal-compliance'].includes(decodedRouteKey) ||
    ['osh-legal-compliance-assessment', 'osh-legal-compliance'].includes(routeKey)
      ? templates.find(
          (template) =>
            template.is_default ||
            template.slug === 'free-legal-compliance-assessment' ||
            template.name === 'Free Legal Compliance Assessment',
        )
      : null
  const generatedSlugMatches = templates.filter(
    (template) =>
      createTemplateSlug(template.name) === routeKey ||
      createTemplateSlug(template.name) === decodedRouteKey,
  )
  const match =
    exactSlugMatch ||
    exactNameMatch ||
    legacyDefaultMatch ||
    (generatedSlugMatches.length === 1 ? generatedSlugMatches[0] : null)

  if (!match && generatedSlugMatches.length > 1) {
    throw new Error('Template link is ambiguous. Open the template from the template list.')
  }

  if (!match?.id) {
    throw new Error('Could not find template.')
  }

  return match.id
}

export const defaultRadioField = () => ({
  key: 'complianceStatus',
  label: 'Compliance Status',
  type: 'radio',
  required: true,
  options: [
    { value: 'comply', label: 'Comply' },
    { value: 'not_comply', label: 'Not comply' },
  ],
})

export const defaultFindingField = () => ({
  key: 'finding',
  label: 'Assessment Finding',
  type: 'textarea',
  required: true,
  rows: 2,
})

export const defaultClause = () => ({
  id: createId('clause'),
  reference: '',
  title: '',
  excerpt: '',
  fields: [defaultRadioField(), defaultFindingField()],
})

export const defaultGroup = () => ({
  id: createId('group'),
  title: '',
  clauses: [],
})

export const emptyContent = (name = 'New Legal Compliance Template') => ({
  title: name,
  description: '',
  groups: [],
})

export const ensureDefaultClauseFields = (fields = []) => {
  const nextFields = Array.isArray(fields) ? [...fields] : []
  const fieldKeys = new Set(nextFields.map((field) => field.key))

  if (!fieldKeys.has('complianceStatus')) {
    nextFields.unshift(defaultRadioField())
  }

  if (!fieldKeys.has('finding')) {
    nextFields.push(defaultFindingField())
  }

  return nextFields
}

export const normalizeDraftContent = (content) => ({
  ...content,
  groups: (content.groups || []).map((group) => ({
    ...group,
    clauses: (group.clauses || []).map((clause) => ({
      ...clause,
      fields: ensureDefaultClauseFields(clause.fields),
    })),
  })),
})

export const areTemplateContentsEqual = (firstContent, secondContent) => {
  if (!firstContent || !secondContent) return false

  return (
    JSON.stringify(normalizeDraftContent(firstContent)) ===
    JSON.stringify(normalizeDraftContent(secondContent))
  )
}

export const buildDraftPayload = (template, draftContent) => ({
  name: template.name,
  description: template.description || '',
  assessment_tier: normalizeAssessmentTier(template.assessment_tier),
  report_title:
    template.report_title || getDefaultReportTitle(template.name, template.assessment_tier),
  disclaimer_text: template.disclaimer_text || getDefaultDisclaimerText(template.assessment_tier),
  is_default: template.is_default,
  updated_at: template.updated_at || null,
  draft_content: normalizeDraftContent({
    ...draftContent,
    title: template.name,
    description: template.description || '',
    assessment_tier: normalizeAssessmentTier(template.assessment_tier),
    report_title:
      template.report_title || getDefaultReportTitle(template.name, template.assessment_tier),
    disclaimer_text: template.disclaimer_text || getDefaultDisclaimerText(template.assessment_tier),
  }),
})

const normalizePublishTitle = (value = '') => String(value).trim().replace(/\s+/g, ' ')

export const validateTemplateForPublish = (template, draftContent) => {
  const issues = []
  const groups = draftContent?.groups || []

  if (!String(template?.name || '').trim()) {
    issues.push('Template name is required.')
  }

  if (groups.length === 0) {
    issues.push('Add at least one legislation.')
    return issues
  }

  let titledClauseCount = 0
  groups.forEach((group, groupIndex) => {
    const groupName = String(group.title || '').trim()
    const groupLabel = groupName || `Legislation ${groupIndex + 1}`

    if (!groupName) {
      issues.push(`${groupLabel} needs a legislation name.`)
    }

    const clauses = group.clauses || []
    if (clauses.length === 0) {
      issues.push(`${groupLabel} needs at least one clause.`)
    }

    const clauseTitleCounts = clauses.reduce((counts, clause) => {
      const label = normalizePublishTitle(clause.title)
      const title = label.toLowerCase()
      if (!title) return counts
      counts[title] = {
        label,
        count: (counts[title]?.count || 0) + 1,
      }
      return counts
    }, {})

    clauses.forEach((clause, clauseIndex) => {
      const clauseTitle = normalizePublishTitle(clause.title)
      const clauseExcerpt = String(clause.excerpt || '').trim()

      if (clauseTitle) {
        titledClauseCount += 1
      } else {
        issues.push(`${groupLabel} has an untitled clause at position ${clauseIndex + 1}.`)
      }

      if (!clauseExcerpt) {
        issues.push(
          `${groupLabel} - ${clauseTitle || `Clause ${clauseIndex + 1}`} needs a description.`,
        )
      }
    })

    Object.values(clauseTitleCounts).forEach(({ label, count }) => {
      if (count > 1) {
        issues.push(`${groupLabel} has duplicate clause title: ${label}.`)
      }
    })
  })

  if (titledClauseCount === 0 && issues.length === 0) {
    issues.push('Add at least one titled clause.')
  }

  return issues
}
