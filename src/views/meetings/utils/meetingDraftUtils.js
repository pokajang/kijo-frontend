import { STEP_DETAILS } from './meetingConstants'
import { normalizeDraftForm } from './meetingFormModel'

export const generateMeetingDraftKey = () => {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const parseStoredMeetingDraft = (raw) => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return {
      form: normalizeDraftForm(parsed?.form),
      currentStep: Number(parsed?.currentStep || STEP_DETAILS),
      recordId: Number(parsed?.recordId || 0),
      draftKey: String(parsed?.draftKey || '').trim(),
      savedAt: String(parsed?.savedAt || ''),
    }
  } catch {
    return null
  }
}

export const buildRecordDraftStorageKey = (recordId) => {
  const id = Number(recordId || 0)
  return id > 0 ? `meetingMinuteRecordDraftV1:${id}` : ''
}

export const readMeetingDraft = (storageKey) => {
  if (!storageKey) return null
  try {
    return parseStoredMeetingDraft(window.localStorage.getItem(storageKey))
  } catch {
    return null
  }
}

export const writeMeetingDraft = (storageKey, payload) => {
  if (!storageKey) return
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // Ignore storage quota / browser restrictions.
  }
}

export const removeMeetingDraft = (storageKey) => {
  if (!storageKey) return
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Ignore storage quota / browser restrictions.
  }
}
