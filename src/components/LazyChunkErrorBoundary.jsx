import React from 'react'
import { CAlert, CButton } from '@coreui/react'

const RELOAD_KEY = 'kijo:lazy-chunk-reload-attempted'
const RELOAD_RETRY_WINDOW_MS = 30000

const chunkErrorPatterns = [
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /dynamically imported module/i,
]

export const isLazyChunkError = (error) => {
  const text = `${error?.name || ''} ${error?.message || ''} ${error?.stack || ''}`
  return chunkErrorPatterns.some((pattern) => pattern.test(text))
}

const getSessionValue = (key) => {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const setSessionValue = (key, value) => {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Ignore storage failures. The reload still handles the common stale chunk case.
  }
}

const removeSessionValue = (key) => {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

const readPreviousReloadAttempt = () => {
  try {
    return JSON.parse(getSessionValue(RELOAD_KEY) || '{}')
  } catch {
    return {}
  }
}

class LazyChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (!isLazyChunkError(error)) return

    const currentPath = `${window.location.pathname || '/'}${window.location.search || ''}`
    const now = Date.now()
    const previousAttempt = readPreviousReloadAttempt()
    const previousTime = Number(previousAttempt.timestamp || 0)
    if (previousAttempt.path === currentPath && now - previousTime < RELOAD_RETRY_WINDOW_MS) return

    setSessionValue(RELOAD_KEY, JSON.stringify({ path: currentPath, timestamp: now }))
    window.location.reload()
  }

  handleManualReload = () => {
    removeSessionValue(RELOAD_KEY)
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (isLazyChunkError(error)) {
      return (
        <CAlert color="warning" className="m-3">
          <div className="fw-semibold mb-2">
            The application was updated while this page was open.
          </div>
          <div className="mb-3">Reload the page to load the latest application files.</div>
          <CButton color="primary" size="sm" onClick={this.handleManualReload}>
            Reload
          </CButton>
        </CAlert>
      )
    }

    throw error
  }
}

export default LazyChunkErrorBoundary
