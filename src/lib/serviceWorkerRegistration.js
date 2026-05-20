const SERVICE_WORKER_URL = '/sw.js'
const CACHE_PREFIX = 'kijo-'
const RELOAD_TIMEOUT_MS = 4000

let registrationPromise = null

export const registerAppServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return Promise.resolve(null)
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error) => {
      console.error('Service worker registration failed', error)
      registrationPromise = null
      throw error
    })
  }

  return registrationPromise
}

export const getAppServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  if (registrationPromise) {
    try {
      return await registrationPromise
    } catch {
      // fall through to getRegistration
    }
  }

  return navigator.serviceWorker.getRegistration()
}

const waitForWaitingWorker = (registration) =>
  new Promise((resolve) => {
    if (!registration) {
      resolve(null)
      return
    }

    if (registration.waiting) {
      resolve(registration.waiting)
      return
    }

    let resolved = false
    let timeoutId

    const finish = (worker) => {
      if (resolved) return
      resolved = true
      window.clearTimeout(timeoutId)
      resolve(worker || null)
    }

    const installListener = () => {
      const worker = registration.installing
      if (!worker) {
        finish(null)
        return
      }

      if (worker.state === 'installed') {
        finish(registration.waiting || worker)
        return
      }

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          finish(registration.waiting || worker)
        } else if (worker.state === 'redundant') {
          finish(null)
        }
      })
    }

    timeoutId = window.setTimeout(() => finish(registration.waiting || null), 1500)
    registration.addEventListener('updatefound', installListener, { once: true })
    if (registration.installing) {
      installListener()
    }
  })

const clearAppCaches = async () => {
  if (!('caches' in window)) return

  const keys = await caches.keys()
  await Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)),
  )
}

const reloadWithVersion = (version) => {
  const url = new URL(window.location.href)
  url.searchParams.set('v', version || String(Date.now()))
  window.location.replace(url.toString())
}

const activateWaitingWorker = (worker, version) =>
  new Promise((resolve) => {
    let reloaded = false
    let timeoutId

    const finish = () => {
      if (reloaded) return
      reloaded = true
      window.clearTimeout(timeoutId)
      resolve()
    }

    const handleControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      reloadWithVersion(version)
      finish()
    }

    timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      reloadWithVersion(version)
      finish()
    }, RELOAD_TIMEOUT_MS)

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, {
      once: true,
    })

    worker?.postMessage({ type: 'SKIP_WAITING' })
  })

export const applyAppUpdate = async (version) => {
  const registration = await getAppServiceWorkerRegistration()

  try {
    await clearAppCaches()
  } catch (error) {
    console.error('Failed to clear app caches', error)
  }

  if (!registration) {
    reloadWithVersion(version)
    return
  }

  try {
    await registration.update()
  } catch (error) {
    console.error('Service worker update check failed', error)
  }

  const waitingWorker = await waitForWaitingWorker(registration)
  if (waitingWorker) {
    await activateWaitingWorker(waitingWorker, version)
    return
  }

  reloadWithVersion(version)
}
