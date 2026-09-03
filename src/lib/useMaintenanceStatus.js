import { useCallback, useEffect, useRef, useState } from 'react'

import { applyAppUpdate } from './serviceWorkerRegistration'

export const DEFAULT_MAINTENANCE_POLL_MS = 30 * 1000
export const DEFAULT_MAINTENANCE_STATUS_URL = '/maintenance-status.json'

export const normalizeMaintenanceStatus = (payload) =>
  typeof payload?.maintenance === 'boolean' ? payload.maintenance : null

const useMaintenanceStatus = ({
  pollMs = DEFAULT_MAINTENANCE_POLL_MS,
  statusUrl = DEFAULT_MAINTENANCE_STATUS_URL,
} = {}) => {
  const [maintenanceActive, setMaintenanceActive] = useState(false)
  const maintenanceSeenRef = useRef(false)
  const reloadStartedRef = useRef(false)
  const requestInFlightRef = useRef(false)
  const mountedRef = useRef(false)

  const checkStatus = useCallback(async () => {
    if (requestInFlightRef.current || reloadStartedRef.current) return

    requestInFlightRef.current = true

    try {
      const response = await fetch(statusUrl, { cache: 'no-store' })
      if (!response.ok) return

      const active = normalizeMaintenanceStatus(await response.json())
      if (active === null) return

      if (active) {
        maintenanceSeenRef.current = true
        if (mountedRef.current) setMaintenanceActive(true)
        return
      }

      if (maintenanceSeenRef.current) {
        reloadStartedRef.current = true
        await applyAppUpdate()
        return
      }

      if (mountedRef.current) setMaintenanceActive(false)
    } catch {
      // A network failure is not proof that a planned maintenance window is active.
    } finally {
      requestInFlightRef.current = false
    }
  }, [statusUrl])

  useEffect(() => {
    mountedRef.current = true
    checkStatus()

    const intervalId = window.setInterval(checkStatus, pollMs)
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkStatus()
    }

    window.addEventListener('focus', checkStatus)
    document.addEventListener('visibilitychange', checkWhenVisible)

    return () => {
      mountedRef.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkStatus)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [checkStatus, pollMs])

  return { maintenanceActive, checkStatus }
}

export default useMaintenanceStatus
