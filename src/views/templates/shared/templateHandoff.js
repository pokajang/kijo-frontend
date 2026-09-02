import { getCurrentReturnTo, sanitizeInternalReturnTo } from '../../../utils/navigation/returnTo'
import { getTemplateId, normalizeTemplateLanguage } from './templateUtils'

export const QUOTE_TEMPLATE_TYPES = ['training', 'ih', 'manpower', 'special']

export const isQuoteTemplateType = (value) => QUOTE_TEMPLATE_TYPES.includes(value)

export const buildQuoteTemplateCreateNavigation = ({
  location,
  serviceKey,
  proposalLanguage,
  specialCategoryId,
  specialCategoryName,
}) => {
  if (!isQuoteTemplateType(serviceKey)) return null

  const returnTo = sanitizeInternalReturnTo(getCurrentReturnTo(location), '/crm/quotes')
  const quoteReturnTo = sanitizeInternalReturnTo(location?.state?.returnTo, '')
  return {
    to: `/templates/create?type=${encodeURIComponent(serviceKey)}${specialCategoryId ? `&categoryId=${encodeURIComponent(specialCategoryId)}` : ''}`,
    state: {
      returnTo,
      templateHandoff: {
        origin: 'quote',
        serviceKey,
        proposalLanguage: normalizeTemplateLanguage(proposalLanguage),
        ...(serviceKey === 'special' && specialCategoryId
          ? { specialCategoryId: Number(specialCategoryId), specialCategoryName }
          : {}),
        quoteState: {
          ...(quoteReturnTo ? { returnTo: quoteReturnTo } : {}),
          initialService: serviceKey,
          ...(serviceKey === 'special' && specialCategoryId
            ? { specialCategoryId: Number(specialCategoryId) }
            : {}),
        },
      },
    },
  }
}

export const getTemplateHandoff = (location = {}) => {
  const handoff = location.state?.templateHandoff
  if (
    handoff?.origin !== 'quote' ||
    !isQuoteTemplateType(handoff?.serviceKey) ||
    typeof location.state?.returnTo !== 'string'
  ) {
    return null
  }

  return {
    origin: 'quote',
    serviceKey: handoff.serviceKey,
    proposalLanguage: normalizeTemplateLanguage(handoff.proposalLanguage),
    specialCategoryId: Number(handoff.specialCategoryId) || null,
    specialCategoryName: handoff.specialCategoryName || '',
    quoteState:
      handoff.quoteState && typeof handoff.quoteState === 'object'
        ? {
            ...(sanitizeInternalReturnTo(handoff.quoteState.returnTo, '')
              ? { returnTo: sanitizeInternalReturnTo(handoff.quoteState.returnTo, '') }
              : {}),
            initialService: handoff.serviceKey,
            ...(handoff.serviceKey === 'special' && handoff.specialCategoryId
              ? { specialCategoryId: Number(handoff.specialCategoryId) }
              : {}),
          }
        : { initialService: handoff.serviceKey },
  }
}

export const buildTemplateCompletionState = ({ location, serviceKey, response }) => {
  const handoff = getTemplateHandoff(location)
  const templateId = getTemplateId(response)
  if (!handoff || handoff.serviceKey !== serviceKey || !templateId) return undefined

  return {
    ...(handoff.quoteState || {}),
    proposalTemplateCreated: {
      serviceKey,
      templateId,
      proposalLanguage: handoff.proposalLanguage,
      ...(serviceKey === 'special' && handoff.specialCategoryId
        ? {
            specialCategoryId: Number(handoff.specialCategoryId),
            specialCategoryName: handoff.specialCategoryName || '',
          }
        : {}),
    },
  }
}

export const getCreatedProposalTemplate = (location = {}) => {
  const result = location.state?.proposalTemplateCreated
  const templateId = Number(result?.templateId)
  if (!isQuoteTemplateType(result?.serviceKey) || !Number.isFinite(templateId) || templateId <= 0) {
    return null
  }

  return {
    serviceKey: result.serviceKey,
    templateId,
    proposalLanguage: normalizeTemplateLanguage(result.proposalLanguage),
    ...(result.serviceKey === 'special'
      ? {
          specialCategoryId: Number(result.specialCategoryId) || null,
          specialCategoryName: result.specialCategoryName || '',
        }
      : {}),
  }
}

export const getTemplateReturnState = (location = {}) => getTemplateHandoff(location)?.quoteState

export const withoutCreatedProposalTemplate = (state = {}) => {
  const next = { ...(state || {}) }
  delete next.proposalTemplateCreated
  return next
}
