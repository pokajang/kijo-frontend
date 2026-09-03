import DOMPurify from 'dompurify'

const ALLOWED_TEMPLATE_HTML_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ol',
  'ul',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

export const isSuccess = (payload) =>
  payload?.status === 'success' || payload?.success === true || payload?.ok === true

export const unwrapRows = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows
  if (payload?.data && typeof payload.data === 'object' && payload.data.id != null) {
    return [payload.data]
  }
  if (
    payload &&
    typeof payload === 'object' &&
    (payload.id != null || payload.template_id != null || payload.proposal_id != null)
  ) {
    return [payload]
  }
  return []
}

export const getTemplateId = (row) => {
  const raw =
    row?.id ??
    row?.template_id ??
    row?.templateId ??
    row?.proposal_id ??
    row?.data?.id ??
    row?.data?.template_id ??
    row?.data?.templateId ??
    row?.data?.proposal_id
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const normalizeTemplateLanguage = (language) => {
  const value = String(language || '').trim()
  const normalized = value.toLowerCase()
  return ['bm', 'ms', 'ms-my', 'ms_my', 'bahasa', 'bahasa melayu'].includes(normalized)
    ? 'ms-MY'
    : 'en'
}

export const getSourceTemplateId = (row) => {
  const raw = row?.sourceTemplateId ?? row?.source_template_id
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const isBmTemplate = (row) =>
  (row?.proposalLanguage || row?.proposal_language || '') === 'ms-MY'

export const getTranslationStatus = (row) =>
  row?.translationStatus || row?.translation_status || null

export const isMachineDraftBmTemplate = (row) =>
  isBmTemplate(row) && getTranslationStatus(row) === 'machine_draft'

export const normalizeTemplateMeta = (row = {}) => ({
  proposalLanguage: row?.proposalLanguage || row?.proposal_language || 'en',
  sourceTemplateId: row?.sourceTemplateId || row?.source_template_id || null,
  translationStatus: getTranslationStatus(row),
  translationNotes: row?.translationNotes || row?.translation_notes || null,
})

export const stripHtml = (value = '') =>
  String(value || '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

const decodeHtmlEntities = (value) => {
  if (typeof document === 'undefined') {
    return value
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;/gi, "'")
  }

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export const richTextToPlainText = (value = '') => {
  const textWithLineBreaks = String(value || '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li(?:\s[^>]*)?>/gi, '• ')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')

  return decodeHtmlEntities(textWithLineBreaks)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const sanitizeDisplayHtml = (raw) => {
  if (!raw) return ''

  return DOMPurify.sanitize(String(raw), {
    ALLOWED_TAGS: ALLOWED_TEMPLATE_HTML_TAGS,
    ALLOWED_ATTR: [],
  }).replace(/<br\s*\/?>/gi, '<br/>')
}

export const formatTemplateDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const getTemplateConfirmationTitle = (row, fallback = 'this proposal') => {
  const value = stripHtml(
    row?.title || row?.displayTitle || row?.trainingTitle || row?.serviceTitle || '',
  )
    .replace(/\s+/g, ' ')
    .trim()

  return value || fallback
}

export const buildBmCopyConfirmation = (row, fallbackTitle = 'this proposal') => {
  const title = getTemplateConfirmationTitle(row, fallbackTitle)

  return {
    message: `Create a Bahasa Melayu machine-translated copy for:\n\n"${title}"\n\nThis will use Google Translate to create an editable BM copy of the English template.`,
    options: {
      title: 'Create BM Copy',
      confirmText: 'Create BM Copy',
      alert: {
        color: 'warning',
        message:
          'You need to verify each translation properly before using it in quotations or sales documents. Machine translation can be inaccurate for technical, legal, or commercial wording. This feature uses the Google Translation API, so only use it when you really need a BM version of this proposal. Do not translate all proposals in KIJO because excessive usage may create Google charges.',
      },
    },
  }
}

export const buildExistingBmCopyConfirmation = (row, fallbackTitle = 'this proposal') => {
  const title = getTemplateConfirmationTitle(row, fallbackTitle)

  return {
    message: `This English proposal already has a Bahasa Melayu version:\n\n"${title}"\n\nOpen the existing BM proposal instead?`,
    options: {
      title: 'BM Copy Already Exists',
      confirmText: 'Open BM Proposal',
    },
  }
}

export const buildBmCopyIndex = (bmRows = []) => {
  const index = new Map()
  ;(Array.isArray(bmRows) ? bmRows : []).forEach((row) => {
    const sourceId = getSourceTemplateId(row)
    const bmId = getTemplateId(row)
    if (sourceId && bmId) {
      index.set(sourceId, bmId)
    }
  })
  return index
}

export const attachBmCopyLinks = (rows = [], bmRows = []) => {
  const bmCopyIndex = buildBmCopyIndex(bmRows)

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const templateId = getTemplateId(row)
    const bmTemplateId = templateId ? bmCopyIndex.get(templateId) || null : null
    return {
      ...row,
      hasBmCopy: Boolean(bmTemplateId),
      bmTemplateId,
    }
  })
}
