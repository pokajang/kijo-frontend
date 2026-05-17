const baseUrl = import.meta.env.VITE_API_BASE || '/'

export const quoteApiUrl = (path) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

export const quoteServiceUrl = (serviceKey, quoteId = null) => {
  const suffix = quoteId ? `/${encodeURIComponent(quoteId)}` : ''
  return quoteApiUrl(`quotes/${serviceKey}${suffix}`)
}

export const normalizeQuoteResult = (rawResult) =>
  rawResult?.data && typeof rawResult.data === 'object'
    ? { ...rawResult, ...rawResult.data }
    : rawResult

export const quoteSaveMethod = (isEditMode) => (isEditMode ? 'PUT' : 'POST')
