import { useEffect, useState } from 'react'

const DEFAULT_POLL_MS = 5 * 60 * 1000
const VERSION_URL = import.meta.env.VITE_VERSION_URL || '/meta.json'
const CURRENT_VERSION =
  import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_COMMIT_SHA || '0.0.0-local'
const STORAGE_KEY = 'app_version'

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

const parsePollMs = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : DEFAULT_POLL_MS
}

const useVersionCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [latestVersion, setLatestVersion] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(resolveInitialVersion)
  const pollMs = parsePollMs(import.meta.env.VITE_VERSION_POLL_MS)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch(VERSION_URL, { cache: 'no-store' })
        if (!res.ok) return

        const data = await res.json()
        const remoteVersion = data?.version

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

        if (remoteVersion !== currentVersion) {
          setLatestVersion(remoteVersion)
          setUpdateAvailable(true)
        }
      } catch (err) {
        console.error('Version check failed:', err)
      }
    }

    check()
    const intervalId = window.setInterval(check, pollMs)
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        check()
      }
    }

    document.addEventListener('visibilitychange', checkWhenVisible)
    window.addEventListener('focus', check)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', checkWhenVisible)
      window.removeEventListener('focus', check)
    }
  }, [pollMs, currentVersion])

  return {
    updateAvailable,
    latestVersion,
    reload: () => {
      if (latestVersion) {
        try {
          localStorage.setItem(STORAGE_KEY, latestVersion)
        } catch {
          // ignore storage failures
        }
      }
      const url = new URL(window.location.href)
      url.searchParams.set('v', latestVersion || String(Date.now()))
      window.location.replace(url.toString())
    },
  }
}

export default useVersionCheck
