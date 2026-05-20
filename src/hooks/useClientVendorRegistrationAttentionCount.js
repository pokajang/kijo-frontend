import { useCallback, useEffect, useState } from 'react'

export const CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT = 'client-vendor-registrations:changed'

export const dispatchClientVendorRegistrationChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT))
}

export const fetchClientVendorRegistrationAttentionCount = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE}client-vendor-registrations/attention-count`,
    { credentials: 'include' },
  )
  const contentType = response.headers.get('content-type') || ''
  const result = contentType.includes('application/json')
    ? await response.json()
    : {
        status: 'error',
        message: response.ok ? '' : `Request failed with HTTP ${response.status}.`,
      }
  if (!response.ok || result.status !== 'success') {
    throw new Error(result.message || 'Failed to fetch vendor registration attention count.')
  }

  const data = result.data || {}
  return {
    expiredCount: Number(data.expired_count ?? data.count ?? 0) || 0,
    expiringSoonCount: Number(data.expiring_soon_count ?? 0) || 0,
    count: Number(data.count ?? data.expired_count ?? 0) || 0,
  }
}

export const useClientVendorRegistrationAttentionCount = ({ refreshKey = '' } = {}) => {
  const [counts, setCounts] = useState({
    expiredCount: 0,
    expiringSoonCount: 0,
    count: 0,
  })

  const refresh = useCallback(() => {
    fetchClientVendorRegistrationAttentionCount()
      .then(setCounts)
      .catch(() => {
        setCounts({
          expiredCount: 0,
          expiringSoonCount: 0,
          count: 0,
        })
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshKey])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const intervalId = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    window.addEventListener(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT, refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      window.removeEventListener(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  return { ...counts, refresh }
}
