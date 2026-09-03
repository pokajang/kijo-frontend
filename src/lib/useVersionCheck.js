import { useCallback, useEffect, useRef, useState } from 'react'

import { applyAppUpdate, getAppServiceWorkerRegistration } from './serviceWorkerRegistration'
import { normalizeMetaPayload, parsePollMs, shouldForceUpdate } from './versionCheckUtils'
import { runSingleFlight } from '../utils/runSingleFlight'

const VERSION_URL = import.meta.env.VITE_VERSION_URL || '/meta.json'
const CURRENT_VERSION =
  import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_COMMIT_SHA || '0.0.0-local'
const STORAGE_KEY = 'app_version'
const FORCE_ATTEMPT_PREFIX = 'forced_update_attempt:'

const resolveInitialVersion = () => {
  if (CURRENT_VERSION && CURRENT_VERSION !== '0.0.0-local') {
    return CURRENT_VERSION
  }
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const useVersionCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [latestVersion, setLatestVersion] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(resolveInitialVersion)
  const [forceUpdate, setForceUpdate] = useState(false)
  const [message, setMessage] = useState(null)
  const [isReloading, setIsReloading] = useState(false)
  const latestVersionRef = useRef(null)
  const checkInFlightRef = useRef(null)
  const pollMs = parsePollMs(import.meta.env.VITE_VERSION_POLL_MS)

  useEffect(() => {
    latestVersionRef.current = latestVersion
  }, [latestVersion])

  const reload = useCallback(async () => {
    const version = latestVersionRef.current

    if (version) {
      try {
        localStorage.setItem(STORAGE_KEY, version)
      } catch {
        // ignore storage failures
      }
    }

    setIsReloading(true)

    try {
      await applyAppUpdate(version)
    } finally {
      window.setTimeout(() => setIsReloading(false), 5000)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const check = () =>
      runSingleFlight(checkInFlightRef, async () => {
        try {
          const registration = await getAppServiceWorkerRegistration()
          if (registration?.waiting && !cancelled) {
            setUpdateAvailable(true)
          }

          const res = await fetch(VERSION_URL, { cache: 'no-store' })
          if (!res.ok) return

          const data = normalizeMetaPayload(await res.json())
          const remoteVersion = data.version

          if (!remoteVersion || cancelled) return

          if (!currentVersion) {
            setCurrentVersion(remoteVersion)
            try {
              localStorage.setItem(STORAGE_KEY, remoteVersion)
            } catch {
              // ignore storage failures
            }
            return
          }

          const nextForceUpdate = shouldForceUpdate({
            currentVersion,
            latestVersion: remoteVersion,
            minimumSupportedVersion: data.minimumSupportedVersion,
            forceReload: data.forceReload,
          })

          setForceUpdate(nextForceUpdate)
          setMessage(data.message)

          if (remoteVersion !== currentVersion || nextForceUpdate || registration?.waiting) {
            setLatestVersion(remoteVersion)
            setUpdateAvailable(true)
            return
          }

          setLatestVersion(null)
          if (!registration?.waiting) {
            setUpdateAvailable(false)
          }
        } catch (err) {
          console.error('Version check failed:', err)
        }
      })

    check()
    const checkWhenActive = () => {
      if (document.visibilityState !== 'hidden') check()
    }
    const intervalId = window.setInterval(checkWhenActive, pollMs)
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        check()
      }
    }

    document.addEventListener('visibilitychange', checkWhenVisible)
    window.addEventListener('focus', checkWhenActive)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', checkWhenVisible)
      window.removeEventListener('focus', checkWhenActive)
    }
  }, [pollMs, currentVersion])

  useEffect(() => {
    if (!forceUpdate || !latestVersion || isReloading) return

    const attemptKey = `${FORCE_ATTEMPT_PREFIX}${latestVersion}`

    try {
      if (sessionStorage.getItem(attemptKey)) {
        return
      }
      sessionStorage.setItem(attemptKey, '1')
    } catch {
      // ignore storage failures
    }

    reload()
  }, [forceUpdate, latestVersion, isReloading, reload])

  return {
    updateAvailable,
    latestVersion,
    forceUpdate,
    message,
    isReloading,
    reload,
  }
}

export default useVersionCheck
