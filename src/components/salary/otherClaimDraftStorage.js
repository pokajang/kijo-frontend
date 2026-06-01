export const OTHER_CLAIM_DRAFT_VERSION = 'v1'

const getStorage = (storage) => {
  if (storage) return storage
  return typeof localStorage !== 'undefined' ? localStorage : null
}

const isDraftObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

export const getOtherClaimDraftKey = (claimMonth = '') =>
  `otherClaimDraft:${OTHER_CLAIM_DRAFT_VERSION}:${claimMonth || 'current'}`

const removeDraft = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.removeItem !== 'function') return

  try {
    activeStorage.removeItem(key)
  } catch {
    // Draft storage is best-effort; Other Claim Apply should remain usable without it.
  }
}

export const readOtherClaimDraft = ({ claimMonth = '', storage } = {}) => {
  const activeStorage = getStorage(storage)
  const key = getOtherClaimDraftKey(claimMonth)
  if (!activeStorage || typeof activeStorage.getItem !== 'function') return null

  try {
    const raw = activeStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!isDraftObject(parsed)) {
      removeDraft(key, activeStorage)
      return null
    }

    return parsed
  } catch {
    removeDraft(key, activeStorage)
    return null
  }
}

export const writeOtherClaimDraft = ({ claimMonth = '', draft, storage } = {}) => {
  if (!isDraftObject(draft)) return false

  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.setItem !== 'function') return false

  try {
    activeStorage.setItem(
      getOtherClaimDraftKey(claimMonth || draft.formData?.claimMonth),
      JSON.stringify({
        ...draft,
        savedAt: new Date().toISOString(),
      }),
    )
    return true
  } catch {
    return false
  }
}

export const clearOtherClaimDraft = ({ claimMonth = '', storage } = {}) => {
  removeDraft(getOtherClaimDraftKey(claimMonth), storage)
}
