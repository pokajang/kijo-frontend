export const TEMPLATE_DRAFT_VERSION = 1
export const TEMPLATE_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const getTemplateDraftKey = (type) => `templateDraft.${type}.v${TEMPLATE_DRAFT_VERSION}`

const canUseLocalStorage = () =>
  typeof window !== 'undefined' &&
  window.localStorage &&
  typeof window.localStorage.getItem === 'function' &&
  typeof window.localStorage.setItem === 'function' &&
  typeof window.localStorage.removeItem === 'function'

export const createTemplateDraftRecord = (type, payload, savedAt = new Date().toISOString()) => ({
  version: TEMPLATE_DRAFT_VERSION,
  type,
  savedAt,
  payload,
})

export const readTemplateDraft = (type, key = getTemplateDraftKey(type)) => {
  if (!canUseLocalStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (parsed?.version !== TEMPLATE_DRAFT_VERSION || parsed?.type !== type) {
      return null
    }

    const savedAt = new Date(parsed.savedAt)
    if (Number.isNaN(savedAt.getTime())) return null
    if (Date.now() - savedAt.getTime() > TEMPLATE_DRAFT_TTL_MS) return null

    return parsed.payload || null
  } catch {
    return null
  }
}

export const writeTemplateDraft = (type, payload, key = getTemplateDraftKey(type)) => {
  if (!canUseLocalStorage()) return

  window.localStorage.setItem(key, JSON.stringify(createTemplateDraftRecord(type, payload)))
}

export const clearTemplateDraft = (type, key = getTemplateDraftKey(type)) => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(key)
}
