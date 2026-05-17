export const isSuccess = (payload) =>
  payload?.status === 'success' ||
  payload?.success === true ||
  payload?.ok === true ||
  payload?.data?.status === 'success' ||
  payload?.data?.success === true ||
  payload?.data?.ok === true

export const getMessage = (payload, fallback = 'Request failed.') =>
  payload?.message || payload?.error || payload?.data?.message || fallback

export const buildCompatUrls = (url) => {
  if (!url || typeof url !== 'string') return []
  return [url]
}

export const postJsonCompat = async (url, body) => {
  const urls = buildCompatUrls(url)
  let lastError = null
  for (const candidate of urls) {
    try {
      const response = await fetch(candidate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (response.ok || isSuccess(result)) {
        return result
      }
      lastError = new Error(getMessage(result, `HTTP error! status: ${response.status}`))
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('Request failed')
}

export const fetchJsonCompat = async (url, options = {}) => {
  const candidates = buildCompatUrls(url)
  let lastError = null
  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, {
        credentials: 'include',
        ...options,
      })
      const json = await res.json()
      if (res.ok || isSuccess(json)) {
        return json
      }
      lastError = new Error(getMessage(json, `HTTP ${res.status}`))
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('Request failed')
}
