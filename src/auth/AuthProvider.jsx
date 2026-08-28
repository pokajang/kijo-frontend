import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { installApiClient, setCsrfToken } from '../api/apiClient'

export const AuthContext = createContext(undefined)
const API_BASE = import.meta.env.VITE_API_BASE || '/' // ensure trailing path segments resolve
const SESSION_CHECK_INTERVAL_MS = 2 * 60 * 1000
const PUBLIC_PATH_PREFIXES = ['/share/workload/', '/share/payment-summary', '/reset-password/']
const LOGIN_SERVICE_ERROR = 'Login service returned an unexpected response. Please try again later.'
const HANDBOOK_ACKNOWLEDGEMENT_DISMISSAL_PREFIX = 'kijo:handbook-acknowledgement:dismissed:'

const isJsonResponse = (response) =>
  (response.headers.get('content-type') || '').toLowerCase().includes('application/json')

const isPublicPath = (path) =>
  PUBLIC_PATH_PREFIXES.some((prefix) => String(path || '').startsWith(prefix))

const clearHandbookAcknowledgementDismissals = (staffId) => {
  if (!staffId || typeof window === 'undefined') return

  const prefix = `${HANDBOOK_ACKNOWLEDGEMENT_DISMISSAL_PREFIX}${staffId}:`

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index)
    if (key?.startsWith(prefix)) {
      window.sessionStorage.removeItem(key)
    }
  }
}

const normalizeSessionUser = (payload) => {
  const user = payload?.user || payload?.data?.user || null
  if (!user) return null

  const roles = Array.isArray(user.roles) ? user.roles : []
  const normalizedRoles =
    roles.includes('System Administrator') && !roles.includes('System Admin')
      ? [...roles, 'System Admin']
      : roles

  return {
    ...user,
    staff_id: user.staff_id ?? user.staffId ?? user.id ?? null,
    roles: normalizedRoles,
  }
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | authenticated | unauthenticated
  const navigate = useNavigate()
  const location = useLocation()
  const logoutInFlightRef = useRef(false)

  const logout = useCallback(
    async ({ skipBackend = false, silent = false, reason = '' } = {}) => {
      if (logoutInFlightRef.current) return
      logoutInFlightRef.current = true

      try {
        if (!skipBackend) {
          await fetch(`${API_BASE}auth/logout`, {
            method: 'POST',
            credentials: 'include',
          })
        }
      } catch (err) {
        console.error('Logout error (ignored):', err)
      } finally {
        setCsrfToken(null)
        setUser(null)
        setStatus('unauthenticated')
        logoutInFlightRef.current = false
        if (!silent) {
          navigate('/login', {
            replace: true,
            state: reason ? { reason } : undefined,
          })
        }
      }
    },
    [navigate],
  )

  const handleUnauthorized = useCallback(() => {
    logout({ skipBackend: true, reason: 'session-expired' })
  }, [logout])

  const shouldLogoutForResponse = useCallback(async (response) => {
    if (response.status === 401) {
      return true
    }
    if (response.status !== 403) {
      return false
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return false
    }

    try {
      const data = await response.clone().json()
      const message = String(data?.message || data?.error || '').toLowerCase()
      return (
        message.includes('not logged in') ||
        message.includes('please log in') ||
        message.includes('please login')
      )
    } catch {
      return false
    }
  }, [])

  const checkSession = useCallback(
    async ({ signal, suppressAbortLog = false, silentUnauthenticated = false } = {}) => {
      setStatus((prev) => (prev === 'authenticated' ? prev : 'loading'))
      try {
        const res = await fetch(`${API_BASE}auth/session`, {
          credentials: 'include',
          signal,
        })

        if (res.status === 401 || res.status === 403) {
          if (silentUnauthenticated) {
            setCsrfToken(null)
            setUser(null)
            setStatus('unauthenticated')
            return false
          }
          handleUnauthorized()
          return false
        }

        const data = await res.json()
        setCsrfToken(data?.csrf_token)
        const sessionUser = normalizeSessionUser(data)
        if ((data?.status === 'success' || sessionUser) && sessionUser?.staff_id) {
          setUser(sessionUser)
          setStatus('authenticated')
          return true
        }

        if (silentUnauthenticated) {
          setCsrfToken(null)
          setUser(null)
          setStatus('unauthenticated')
          return false
        }

        handleUnauthorized()
        return false
      } catch (err) {
        const isSuppressedAbort =
          signal?.aborted ||
          err?.name === 'AbortError' ||
          (err instanceof TypeError && String(err.message || '').includes('Failed to fetch'))

        if (suppressAbortLog && isSuppressedAbort) {
          return false
        }

        console.error('Session validation failed:', err)
        // Do not force logout on transient errors; keep current state
        setStatus((prev) => (prev === 'authenticated' ? prev : 'unauthenticated'))
        return false
      }
    },
    [handleUnauthorized],
  )

  const login = useCallback(async (credentials) => {
    const res = await fetch(`${API_BASE}auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (!isJsonResponse(res)) {
      return { ok: false, kind: 'service', message: LOGIN_SERVICE_ERROR }
    }

    const data = await res.json().catch(() => ({}))
    setCsrfToken(data?.csrf_token)

    if (!res.ok) {
      const fallbackMessage =
        res.status >= 500
          ? 'Login service is unavailable. Please try again later.'
          : 'Invalid credentials.'

      return {
        ok: false,
        kind: res.status >= 500 ? 'service' : 'credentials',
        message: data?.message || data?.error || fallbackMessage,
      }
    }

    const sessionUser = normalizeSessionUser(data)
    if ((data?.status === 'success' || sessionUser) && sessionUser?.staff_id) {
      clearHandbookAcknowledgementDismissals(sessionUser.staff_id)
      setUser(sessionUser)
      setStatus('authenticated')
      return { ok: true, data }
    }

    return { ok: false, kind: 'service', message: LOGIN_SERVICE_ERROR }
  }, [])

  const requestPasswordReset = useCallback(async ({ email }) => {
    const res = await fetch(`${API_BASE}auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        message: data?.message || data?.error || 'Unable to request password reset.',
      }
    }

    return { ok: true, data }
  }, [])

  const resetPassword = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      silentError: true,
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        message: data?.message || data?.error || 'Unable to reset password.',
        errors: data?.errors,
      }
    }

    return { ok: true, data }
  }, [])

  useEffect(() => {
    if (location.pathname === '/login' || isPublicPath(location.pathname)) {
      setStatus((prev) => (prev === 'authenticated' ? prev : 'unauthenticated'))
      return undefined
    }

    const controller = new AbortController()
    checkSession({ signal: controller.signal, suppressAbortLog: true })

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }

    const intervalId = window.setInterval(checkSession, SESSION_CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [checkSession, location.pathname])

  useEffect(() => {
    return installApiClient({
      onUnauthorized: async (response) => {
        if (isPublicPath(location.pathname)) return
        if (logoutInFlightRef.current) return
        const shouldLogout = await shouldLogoutForResponse(response)
        if (shouldLogout) handleUnauthorized()
      },
    })
  }, [handleUnauthorized, location.pathname, shouldLogoutForResponse])

  const value = {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    requestPasswordReset,
    resetPassword,
    logout,
    checkSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export default AuthProvider
