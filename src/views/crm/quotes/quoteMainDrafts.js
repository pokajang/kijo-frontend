export const QUOTE_MAIN_DRAFT_KEY = 'draftQuoteMain'

const quoteServiceKeys = ['training', 'ih', 'manpower', 'equipment', 'special']

const getScopedQuoteMainDraftKey = (serviceKey) => `${QUOTE_MAIN_DRAFT_KEY}:${serviceKey}`

const isKnownServiceKey = (serviceKey) => quoteServiceKeys.includes(serviceKey)

const isDraftObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const removeStoredDraft = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // Draft storage is best-effort; the quote flow should remain usable without it.
  }
}

const readJsonDraft = (key) => {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!isDraftObject(parsed)) {
      removeStoredDraft(key)
      return null
    }
    return parsed
  } catch {
    removeStoredDraft(key)
    return null
  }
}

export const readQuoteMainDraft = ({ serviceKey = '', isEditMode = false } = {}) => {
  if (isEditMode) return null

  const explicitServiceKey = isKnownServiceKey(serviceKey) ? serviceKey : ''
  if (explicitServiceKey) {
    const scopedDraft = readJsonDraft(getScopedQuoteMainDraftKey(explicitServiceKey))
    if (scopedDraft) return scopedDraft

    const legacyDraft = readJsonDraft(QUOTE_MAIN_DRAFT_KEY)
    if (!legacyDraft) return null
    if (!legacyDraft.selectedService || legacyDraft.selectedService === explicitServiceKey) {
      return legacyDraft
    }
    return null
  }

  return readJsonDraft(QUOTE_MAIN_DRAFT_KEY)
}

export const writeQuoteMainDraft = (draft) => {
  if (!draft || typeof draft !== 'object') return

  try {
    const payload = JSON.stringify(draft)
    localStorage.setItem(QUOTE_MAIN_DRAFT_KEY, payload)

    if (isKnownServiceKey(draft.selectedService)) {
      localStorage.setItem(getScopedQuoteMainDraftKey(draft.selectedService), payload)
    }
  } catch {
    // Draft persistence should not block quotation creation.
  }
}

export const clearQuoteMainDraft = (serviceKey = '') => {
  removeStoredDraft(QUOTE_MAIN_DRAFT_KEY)

  if (isKnownServiceKey(serviceKey)) {
    removeStoredDraft(getScopedQuoteMainDraftKey(serviceKey))
    return
  }

  quoteServiceKeys.forEach((key) => {
    removeStoredDraft(getScopedQuoteMainDraftKey(key))
  })
}
