import { apiFetch } from '../../../api/apiClient'

const DASHBOARD_FETCH_EVENT = 'kijo:dashboard-fetch'
let dashboardFetchRequestId = 0

const emitDashboardFetchEvent = (phase, requestId, url) => {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(DASHBOARD_FETCH_EVENT, {
      detail: {
        phase,
        requestId,
        url: String(url || ''),
      },
    }),
  )
}

export const fetchJson = async (url, options = {}, signal) => {
  const requestId = `dashboard-fetch-${++dashboardFetchRequestId}`
  emitDashboardFetchEvent('start', requestId, url)

  try {
    const response = await apiFetch(url, {
      ...options,
      credentials: options.credentials ?? 'include',
      signal,
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json') ? await response.json() : null

    if (!response.ok) {
      throw new Error(payload?.message || `Request failed with status ${response.status}`)
    }

    return payload
  } finally {
    emitDashboardFetchEvent('end', requestId, url)
  }
}

export const buildQueryUrl = (url, params = {}) => {
  const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const nextUrl = new URL(url, baseUrl)

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          nextUrl.searchParams.append(key, String(item))
        }
      })
      return
    }

    nextUrl.searchParams.set(key, String(value))
  })

  return nextUrl.toString()
}

export const fetchJsonGet = (url, params = {}, optionsOrSignal = {}, signal) => {
  const isSignal =
    optionsOrSignal && typeof optionsOrSignal === 'object' && 'aborted' in optionsOrSignal
  const options = isSignal ? {} : optionsOrSignal
  const requestSignal = isSignal ? optionsOrSignal : signal

  return fetchJson(buildQueryUrl(url, params), { ...options, method: 'GET' }, requestSignal)
}

export const isAbortError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return error?.name === 'AbortError' || error?.code === 20 || message.includes('abort')
}
