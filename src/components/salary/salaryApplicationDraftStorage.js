export const SALARY_APPLICATION_DRAFT_VERSION = 'v2'

const getStorage = (storage) => {
  if (storage) return storage
  return typeof localStorage !== 'undefined' ? localStorage : null
}

const isDraftObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

export const getSalaryApplicationDraftKey = (salaryMonth = '', staffId = '') =>
  `salaryApplicationDraft:${SALARY_APPLICATION_DRAFT_VERSION}:${staffId || 'anonymous'}:${salaryMonth || 'current'}`

const removeDraft = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.removeItem !== 'function') return

  try {
    activeStorage.removeItem(key)
  } catch {
    // Draft storage is best-effort; Salary Apply should remain usable without it.
  }
}

export const readSalaryApplicationDraft = ({ salaryMonth = '', staffId = '', storage } = {}) => {
  const activeStorage = getStorage(storage)
  const key = getSalaryApplicationDraftKey(salaryMonth, staffId)
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

export const writeSalaryApplicationDraft = ({
  salaryMonth = '',
  staffId = '',
  draft,
  storage,
} = {}) => {
  if (!isDraftObject(draft)) return false

  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.setItem !== 'function') return false

  try {
    activeStorage.setItem(
      getSalaryApplicationDraftKey(salaryMonth || draft.formData?.salaryMonth, staffId),
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

export const clearSalaryApplicationDraft = ({ salaryMonth = '', staffId = '', storage } = {}) => {
  removeDraft(getSalaryApplicationDraftKey(salaryMonth, staffId), storage)
}
