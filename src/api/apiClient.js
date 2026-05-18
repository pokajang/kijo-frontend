const API_EVENT = 'kijo:api'
const API_BASE = import.meta.env.VITE_API_BASE || '/'
const SILENT_PATHS = ['auth/session', 'auth/logout']
const AUTH_LOGIN_PATH = 'auth/login'

let activeRequests = 0
let unauthorizedHandler = null
let csrfToken = null
let csrfRefreshPromise = null

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const emitApiEvent = (detail) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(API_EVENT, { detail }))
}

const notify = (message, color = 'danger') => {
  if (!message) return
  emitApiEvent({ type: 'toast', message, color })
}

const isAbortRequestError = (error, init = {}) => {
  const message = String(error?.message || '').toLowerCase()
  return (
    init?.signal?.aborted ||
    error?.name === 'AbortError' ||
    error?.code === 20 ||
    message.includes('abort')
  )
}

const setBusyDelta = (delta) => {
  activeRequests = Math.max(0, activeRequests + delta)
  emitApiEvent({ type: 'busy', count: activeRequests })
}

const getResponseMessage = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response.statusText || 'Request failed.'

  try {
    const data = await response.clone().json()
    return data?.message || data?.error || response.statusText || 'Request failed.'
  } catch {
    return response.statusText || 'Request failed.'
  }
}

const shouldNotify = (input, response, init = {}) => {
  if (init?.silentError) return false
  if (!response || response.ok) return false

  try {
    const raw = typeof input === 'string' ? input : input?.url
    const url = new URL(raw, window.location.origin)
    const base = new URL(API_BASE, window.location.origin)
    const path = url.pathname.slice(base.pathname.length).replace(/^\/+/, '')
    return !SILENT_PATHS.some((silentPath) => path.startsWith(silentPath))
  } catch {
    return true
  }
}

const handleUnauthorizedResponse = (response) => {
  if (
    (response.status === 401 || response.status === 403) &&
    typeof unauthorizedHandler === 'function'
  ) {
    unauthorizedHandler(response)
  }
}

const normalizeMethod = (init = {}) => String(init?.method || 'GET').toUpperCase()

const isUnsafeMethod = (init = {}) => UNSAFE_METHODS.has(normalizeMethod(init))

const getApiPath = (input) => {
  if (typeof window === 'undefined') return ''

  try {
    const raw = typeof input === 'string' ? input : input?.url
    const url = new URL(raw, window.location.origin)
    const base = new URL(API_BASE, window.location.origin)

    if (url.origin !== base.origin) return ''
    if (!url.pathname.startsWith(base.pathname)) return ''

    return url.pathname.slice(base.pathname.length).replace(/^\/+/, '')
  } catch {
    return ''
  }
}

const isApiRequest = (input) => getApiPath(input) !== ''

const withApiDefaults = (input, init = {}) => {
  if (!isApiRequest(input)) return init

  const headers = new Headers(init.headers || {})
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  return {
    ...init,
    credentials: init.credentials ?? 'include',
    headers,
  }
}

const withCsrfHeader = (init = {}, { force = false } = {}) => {
  if (!csrfToken || !isUnsafeMethod(init)) return init

  const headers = new Headers(init.headers || {})
  if (force || (!headers.has('X-CSRF-TOKEN') && !headers.has('X-XSRF-TOKEN'))) {
    headers.set('X-CSRF-TOKEN', csrfToken)
  }

  return {
    ...init,
    headers,
  }
}

const captureCsrfToken = async (response) => {
  if (!response?.ok) return

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return

  try {
    const data = await response.clone().json()
    if (typeof data?.csrf_token === 'string' && data.csrf_token !== '') {
      csrfToken = data.csrf_token
    }
  } catch {
    // Ignore non-JSON or consumed response edge cases.
  }
}

const refreshCsrfToken = async (originalFetch) => {
  if (csrfRefreshPromise) return csrfRefreshPromise

  csrfRefreshPromise = (async () => {
    const response = await originalFetch(`${API_BASE}auth/session`, {
      credentials: 'include',
    })

    await captureCsrfToken(response)
    return response.ok && typeof csrfToken === 'string' && csrfToken !== ''
  })()

  try {
    return await csrfRefreshPromise
  } finally {
    csrfRefreshPromise = null
  }
}

const shouldRetryWithFreshCsrfToken = (response, init = {}) =>
  response?.status === 419 && isUnsafeMethod(init)

export const setCsrfToken = (token) => {
  csrfToken = typeof token === 'string' && token !== '' ? token : null
}

export const getCsrfToken = () => csrfToken

export const apiClientEvents = {
  name: API_EVENT,
}

export async function apiFetch(input, init = {}) {
  const originalFetch = window.__kijoOriginalFetch || window.fetch
  let requestInit = withApiDefaults(input, init)

  setBusyDelta(1)
  try {
    const apiPath = getApiPath(input)
    if (
      isUnsafeMethod(requestInit) &&
      !csrfToken &&
      apiPath &&
      !apiPath.startsWith(AUTH_LOGIN_PATH)
    ) {
      await refreshCsrfToken(originalFetch)
    }

    requestInit = withCsrfHeader(requestInit)
    let response = await originalFetch(input, requestInit)

    await captureCsrfToken(response)

    if (shouldRetryWithFreshCsrfToken(response, requestInit)) {
      const refreshed = await refreshCsrfToken(originalFetch)

      if (refreshed) {
        requestInit = withCsrfHeader(requestInit, { force: true })
        response = await originalFetch(input, requestInit)
        await captureCsrfToken(response)
      }
    }

    if (shouldNotify(input, response, requestInit)) {
      notify(await getResponseMessage(response), response.status >= 500 ? 'danger' : 'warning')
    }

    handleUnauthorizedResponse(response)

    return response
  } catch (error) {
    if (!requestInit?.silentError && !isAbortRequestError(error, requestInit)) {
      notify(error?.message || 'Network request failed.', 'danger')
    }
    throw error
  } finally {
    setBusyDelta(-1)
  }
}

export async function apiJson(input, init = {}) {
  const response = await apiFetch(input, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      data?.message || data?.error || response.statusText || 'Request failed.',
    )
    error.response = response
    error.data = data
    throw error
  }
  return data
}

export function installApiClient({ onUnauthorized } = {}) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  unauthorizedHandler = onUnauthorized

  if (window.__kijoApiClientInstalled) {
    return () => {
      unauthorizedHandler = null
    }
  }

  const originalFetch = window.fetch
  const originalOpen = window.open

  window.__kijoOriginalFetch = originalFetch
  window.__kijoApiClientInstalled = true

  window.fetch = async (input, init = {}) => {
    return apiFetch(input, init)
  }

  window.open = function patchedOpen(url, target, features) {
    return originalOpen.call(window, url, target, features)
  }

  return () => {
    window.fetch = originalFetch
    window.open = originalOpen
    unauthorizedHandler = null
    delete window.__kijoOriginalFetch
    delete window.__kijoApiClientInstalled
  }
}
