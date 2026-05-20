const baseUrl = import.meta.env.VITE_API_BASE || '/'

export const quoteApiUrl = (path) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

export const quoteServiceUrl = (serviceKey, quoteId = null) => {
  const normalizedServiceKey = String(serviceKey || '').replace(/^\/+|\/+$/g, '')
  const hasQuoteId = quoteId !== null && quoteId !== undefined && quoteId !== ''
  const suffix = hasQuoteId ? `/${encodeURIComponent(quoteId)}` : ''
  return quoteApiUrl(`quotes/${normalizedServiceKey}${suffix}`)
}

export const normalizeQuoteResult = (rawResult) =>
  rawResult?.data && typeof rawResult.data === 'object' && !Array.isArray(rawResult.data)
    ? { ...rawResult.data, ...rawResult }
    : rawResult

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

export const isQuoteResultSuccess = (payload) =>
  Boolean(
    String(payload?.status || '').toLowerCase() === 'success' ||
      payload?.success === true ||
      payload?.ok === true ||
      Array.isArray(payload) ||
      Array.isArray(payload?.data) ||
      Array.isArray(payload?.result) ||
      (payload &&
        typeof payload === 'object' &&
        (payload.id || payload.quote_id || payload.quote_ref_no || payload.quoteRefNo)),
  )

export const ensureQuoteResultSuccess = (payload) =>
  Array.isArray(payload)
    ? { data: payload, success: true }
    : payload && typeof payload === 'object'
      ? { ...payload, success: true }
      : { success: true }

export const readQuoteResultRow = (payload) => {
  if (Array.isArray(payload)) return payload[0] || null
  if (Array.isArray(payload?.data)) return payload.data[0] || null
  if (Array.isArray(payload?.result)) return payload.result[0] || null
  if (payload?.data && typeof payload.data === 'object') return payload.data
  if (payload?.result && typeof payload.result === 'object') return payload.result
  if (payload && typeof payload === 'object') return payload
  return null
}

export const readQuoteResultMeta = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
    payload?.payload,
    payload?.quote,
    payload?.quotation,
    payload?.data?.quote,
    payload?.data?.quotation,
    payload?.data?.result,
    payload?.data?.payload,
    payload?.data?.data,
    Array.isArray(payload?.data) ? payload.data[0] : null,
    Array.isArray(payload) ? payload[0] : null,
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const quoteId = pick(candidate, 'quote_id', 'quoteId', 'quotation_id', 'quotationId', 'id')
      const quoteRefNo = pick(
        candidate,
        'quote_ref_no',
        'quoteRefNo',
        'quotation_no',
        'quotationNo',
        'quote_no',
        'quoteNo',
        'ref_no',
        'refNo',
      )
      if (quoteId !== undefined || quoteRefNo !== undefined) {
        return { quoteId, quoteRefNo }
      }
    }
  }

  return { quoteId: undefined, quoteRefNo: undefined }
}

export const quoteSaveMethod = (isEditMode) => (isEditMode ? 'PUT' : 'POST')
