const languageLabels = {
  en: 'English',
  'ms-MY': 'Bahasa Melayu',
}

const toBool = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string')
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  return false
}

const toPositiveInt = (value) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

export const getRecordProposal = (record = {}) => {
  const proposal = record?.proposal || {}
  const templateType = proposal.templateType ?? proposal.template_type ?? null
  const templateId = toPositiveInt(proposal.templateId ?? proposal.template_id)

  return {
    attachedToPdf: toBool(
      proposal.attachedToPdf ??
        proposal.attached_to_pdf ??
        record?.attachProposal ??
        record?.attach_proposal,
    ),
    templateType: templateType || null,
    templateId,
    title: proposal.title || null,
    language: proposal.language || null,
    canPreviewInline: toBool(proposal.canPreviewInline ?? proposal.can_preview_inline),
  }
}

export const isProposalAttached = (record = {}) => getRecordProposal(record).attachedToPdf

export const canPreviewRecordProposal = (record = {}) => {
  const proposal = getRecordProposal(record)
  return proposal.canPreviewInline === true && Boolean(proposal.templateType && proposal.templateId)
}

export const getRecordProposalLanguageLabel = (record = {}) => {
  const language =
    getRecordProposal(record).language ||
    record?.proposalLanguage ||
    record?.proposal_language ||
    ''
  return languageLabels[language] || language || ''
}

export const getRecordProposalChipText = (record = {}) => {
  const proposal = getRecordProposal(record)
  const title = proposal.canPreviewInline ? proposal.title : null
  const hasLinkedProposal = Boolean(proposal.templateId || proposal.templateType || proposal.title)

  if (title && proposal.attachedToPdf) {
    return `${title} attached to this quote`
  }

  if (title) {
    return `${title} linked to this quote`
  }

  if (proposal.attachedToPdf) {
    return 'Proposal attached to this quote'
  }

  if (hasLinkedProposal) {
    return 'Proposal linked to this quote'
  }

  return 'No proposal linked to this quote'
}
