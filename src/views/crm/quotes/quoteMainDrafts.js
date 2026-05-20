export const QUOTE_MAIN_DRAFT_KEY = 'draftQuoteMain'
export const QUOTE_SERVICE_DRAFT_VERSION = 'v2'
export const DEFAULT_QUOTE_DRAFT_LANGUAGE = 'default'

export const quoteServiceKeys = ['training', 'ih', 'manpower', 'equipment', 'special']

export const LEGACY_QUOTE_SERVICE_DRAFT_KEYS = {
  training: 'draftTrainingQuote',
  ih: 'draftHygieneQuote',
  manpower: 'draftManpowerQuote',
  equipment: 'draftEquipmentQuote',
  special: 'draftSpecialQuote',
}

const getScopedQuoteMainDraftKey = (serviceKey) => `${QUOTE_MAIN_DRAFT_KEY}:${serviceKey}`

const getStorage = (storage) => {
  if (storage) return storage
  return typeof localStorage !== 'undefined' ? localStorage : null
}

const isKnownServiceKey = (serviceKey) => quoteServiceKeys.includes(serviceKey)

const isDraftObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const normalizeScopeValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

const getDraftClientId = (draft) =>
  draft?.selectedClient?.company_id ?? draft?.selectedClient?.clientId

const removeStoredDraft = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.removeItem !== 'function' || !key) return

  try {
    activeStorage.removeItem(key)
  } catch {
    // Draft storage is best-effort; the quote flow should remain usable without it.
  }
}

const writeJsonDraft = (key, draft, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.setItem !== 'function' || !key) return false

  try {
    activeStorage.setItem(key, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

const readJsonDraft = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.getItem !== 'function' || !key) return null

  try {
    const raw = activeStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!isDraftObject(parsed)) {
      removeStoredDraft(key, activeStorage)
      return null
    }
    return parsed
  } catch {
    removeStoredDraft(key, activeStorage)
    return null
  }
}

const getStorageKeys = (storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage) return []

  if (typeof activeStorage.length === 'number' && typeof activeStorage.key === 'function') {
    return Array.from({ length: activeStorage.length }, (_, index) =>
      activeStorage.key(index),
    ).filter(Boolean)
  }

  if (activeStorage.store && typeof activeStorage.store === 'object') {
    return Object.keys(activeStorage.store)
  }

  return Object.keys(activeStorage).filter((key) => typeof activeStorage[key] === 'string')
}

export const getQuoteServiceDraftKey = ({
  serviceKey = '',
  clientId = '',
  language = DEFAULT_QUOTE_DRAFT_LANGUAGE,
} = {}) => {
  if (!isKnownServiceKey(serviceKey)) return ''

  const normalizedClientId = normalizeScopeValue(clientId, 'no-client')
  const normalizedLanguage = normalizeScopeValue(language, DEFAULT_QUOTE_DRAFT_LANGUAGE)
  return `quoteDraft:${QUOTE_SERVICE_DRAFT_VERSION}:${serviceKey}:${normalizedClientId}:${normalizedLanguage}`
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
  if (!isDraftObject(draft)) return

  const payloadWritten = writeJsonDraft(QUOTE_MAIN_DRAFT_KEY, draft)
  if (!payloadWritten) return

  if (isKnownServiceKey(draft.selectedService)) {
    writeJsonDraft(getScopedQuoteMainDraftKey(draft.selectedService), draft)
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

export const readQuoteServiceDraft = ({
  serviceKey = '',
  clientId = '',
  language = DEFAULT_QUOTE_DRAFT_LANGUAGE,
  storage,
} = {}) => {
  if (!isKnownServiceKey(serviceKey)) return null

  const activeStorage = getStorage(storage)
  const scopedKey = getQuoteServiceDraftKey({ serviceKey, clientId, language })
  const scopedDraft = readJsonDraft(scopedKey, activeStorage)
  if (scopedDraft) return scopedDraft

  const hasSpecificClient = clientId !== null && clientId !== undefined && clientId !== ''
  if (hasSpecificClient) {
    const mainDraft = readJsonDraft(QUOTE_MAIN_DRAFT_KEY, activeStorage)
    const mainDraftClientId = getDraftClientId(mainDraft)
    const mainDraftServiceKey = mainDraft?.selectedService || ''
    const mainDraftLanguage =
      mainDraft?.proposalLanguage || language || DEFAULT_QUOTE_DRAFT_LANGUAGE
    const canMigrateLegacy =
      String(mainDraftClientId || '') === String(clientId) &&
      mainDraftServiceKey === serviceKey &&
      mainDraftLanguage === language

    if (!canMigrateLegacy) return null
  }

  const legacyKey = LEGACY_QUOTE_SERVICE_DRAFT_KEYS[serviceKey]
  const legacyDraft = readJsonDraft(legacyKey, activeStorage)
  if (!legacyDraft) return null

  writeJsonDraft(scopedKey, legacyDraft, activeStorage)
  removeStoredDraft(legacyKey, activeStorage)
  return legacyDraft
}

export const writeQuoteServiceDraft = ({
  serviceKey = '',
  clientId = '',
  language = DEFAULT_QUOTE_DRAFT_LANGUAGE,
  draft,
  storage,
} = {}) => {
  if (!isKnownServiceKey(serviceKey) || !isDraftObject(draft)) return false

  return writeJsonDraft(getQuoteServiceDraftKey({ serviceKey, clientId, language }), draft, storage)
}

const removeScopedServiceDrafts = ({ serviceKey = '', clientId, language, storage } = {}) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage) return

  const serviceKeys = isKnownServiceKey(serviceKey) ? [serviceKey] : quoteServiceKeys
  const hasClientScope = clientId !== null && clientId !== undefined && clientId !== ''
  const hasLanguageScope = language !== null && language !== undefined && language !== ''

  if (isKnownServiceKey(serviceKey) && hasClientScope && hasLanguageScope) {
    removeStoredDraft(getQuoteServiceDraftKey({ serviceKey, clientId, language }), activeStorage)
    return
  }

  getStorageKeys(activeStorage).forEach((key) => {
    const matchesService = serviceKeys.some((knownKey) =>
      key.startsWith(`quoteDraft:${QUOTE_SERVICE_DRAFT_VERSION}:${knownKey}:`),
    )
    if (!matchesService) return

    const parts = key.split(':')
    const keyClientId = parts[3] || ''
    const keyLanguage = parts.slice(4).join(':')
    if (hasClientScope && keyClientId !== String(clientId)) return
    if (hasLanguageScope && keyLanguage !== String(language)) return

    removeStoredDraft(key, activeStorage)
  })
}

export const clearQuoteServiceDraft = (scope = {}) => {
  const normalizedScope = typeof scope === 'string' ? { serviceKey: scope } : scope || {}
  const { serviceKey = '', storage } = normalizedScope
  const activeStorage = getStorage(storage)

  removeScopedServiceDrafts({ ...normalizedScope, storage: activeStorage })

  if (isKnownServiceKey(serviceKey)) {
    removeStoredDraft(LEGACY_QUOTE_SERVICE_DRAFT_KEYS[serviceKey], activeStorage)
    return
  }

  Object.values(LEGACY_QUOTE_SERVICE_DRAFT_KEYS).forEach((key) =>
    removeStoredDraft(key, activeStorage),
  )
}
