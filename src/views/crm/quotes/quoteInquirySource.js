import { normalizeQuoteServiceKey, serviceConfig } from './quoteMainServices'

export const QUOTE_INQUIRY_SOURCE_KEY = 'quoteInquirySource'
export const QUOTE_INQUIRY_SOURCE_VERSION = 1
const maxInquirySourceAgeMs = 7 * 24 * 60 * 60 * 1000

const getStorage = (storage) => {
  if (storage) return storage
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null
}

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const removeStorageItem = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.removeItem !== 'function') return

  try {
    activeStorage.removeItem(key)
  } catch {
    // Session handoff is best-effort; quote creation must remain usable.
  }
}

const isFreshTimestamp = (timestamp, now = Date.now()) => {
  if (!timestamp) return true
  const parsed = new Date(timestamp).getTime()
  if (!Number.isFinite(parsed)) return false
  return now - parsed <= maxInquirySourceAgeMs
}

const normalizeInquirySourcePayload = (payload) => {
  if (!isObject(payload)) return null

  const serviceKey = normalizeQuoteServiceKey(
    payload.serviceKey || payload.service_type || payload.service,
  )
  if (!serviceKey) return null

  const timestamp =
    typeof payload.timestamp === 'string' && payload.timestamp.trim()
      ? payload.timestamp
      : new Date().toISOString()

  return {
    version: Number(payload.version || QUOTE_INQUIRY_SOURCE_VERSION),
    clientId: payload.clientId ?? payload.client_id ?? '',
    service: serviceConfig[serviceKey]?.displayName || serviceKey,
    serviceKey,
    source: typeof payload.source === 'string' ? payload.source : '',
    remarks: typeof payload.remarks === 'string' ? payload.remarks : '',
    inquiryId: payload.inquiryId ?? payload.inquiry_id,
    timestamp,
  }
}

export const readQuoteInquirySource = (
  storage,
  { key = QUOTE_INQUIRY_SOURCE_KEY, now = Date.now() } = {},
) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.getItem !== 'function') return null

  try {
    const raw = activeStorage.getItem(key)
    if (!raw) return null
    const normalized = normalizeInquirySourcePayload(JSON.parse(raw))
    if (!normalized || !isFreshTimestamp(normalized.timestamp, now)) {
      removeStorageItem(key, activeStorage)
      return null
    }
    return normalized
  } catch {
    removeStorageItem(key, activeStorage)
    return null
  }
}

export const removeQuoteInquirySource = (storage, key = QUOTE_INQUIRY_SOURCE_KEY) => {
  removeStorageItem(key, storage)
}

export const getMatchingInquiryId = ({ currentInquirySource, selectedClient, selectedService }) => {
  if (!currentInquirySource?.inquiryId) return undefined

  const currentServiceKey = normalizeQuoteServiceKey(
    currentInquirySource.serviceKey || currentInquirySource.service,
  )
  if (currentServiceKey && selectedService && currentServiceKey !== selectedService) {
    return undefined
  }

  const currentClientId = currentInquirySource.clientId
  const selectedClientId = selectedClient?.company_id ?? selectedClient?.clientId
  if (!currentClientId || !selectedClientId) {
    return undefined
  }
  if (String(currentClientId) !== String(selectedClientId)) {
    return undefined
  }

  return currentInquirySource.inquiryId
}

export const writeQuoteInquirySource = (payload, storage, key = QUOTE_INQUIRY_SOURCE_KEY) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.setItem !== 'function') return false

  const normalized = normalizeInquirySourcePayload({
    ...payload,
    timestamp: payload?.timestamp || new Date().toISOString(),
  })

  if (!normalized?.source) {
    removeStorageItem(key, activeStorage)
    return false
  }

  try {
    activeStorage.setItem(
      key,
      JSON.stringify({
        ...normalized,
        version: QUOTE_INQUIRY_SOURCE_VERSION,
      }),
    )
    return true
  } catch {
    return false
  }
}
