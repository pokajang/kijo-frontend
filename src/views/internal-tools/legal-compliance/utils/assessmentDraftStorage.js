export const LOCAL_STORAGE_KEY = 'legalComplianceAssessmentDraft.v2'

export const readLocalDraft = () => {
  if (typeof window === 'undefined') return null

  try {
    const rawDraft = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    return rawDraft ? JSON.parse(rawDraft) : null
  } catch {
    return null
  }
}

export const writeLocalDraft = (draft) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // Local backup is best effort only.
  }
}

export const clearLocalDraft = () => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch {
    // Local backup cleanup is best effort only.
  }
}
