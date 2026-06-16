import { useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'data-table-scroll'
const RESTORE_RETRY_MS = 2500
const RESTORE_TOLERANCE_PX = 2

const readScrollPosition = (key) => {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      left: Number(parsed?.left) || 0,
      top: Number(parsed?.top) || 0,
    }
  } catch {
    return null
  }
}

const writeScrollPosition = (key, position) => {
  if (!key || !position || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      `${STORAGE_PREFIX}:${key}`,
      JSON.stringify({
        left: position.left || 0,
        top: position.top || 0,
      }),
    )
  } catch {
    // Ignore storage failures; scroll memory is a convenience only.
  }
}

const getElementScrollPosition = (element) => ({
  left: element?.scrollLeft || 0,
  top: element?.scrollTop || 0,
})

const getWindowScrollPosition = () => ({
  left: window.scrollX || window.pageXOffset || 0,
  top: window.scrollY || window.pageYOffset || 0,
})

const restoreAcrossLayoutFrames = (restore) => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return

  const startedAt = Date.now()
  const runRestore = () => {
    restore()
    if (Date.now() - startedAt < RESTORE_RETRY_MS) {
      window.requestAnimationFrame(runRestore)
    }
  }

  window.requestAnimationFrame(runRestore)
}

const createPendingRestore = (position) =>
  position
    ? {
        left: position.left || 0,
        top: position.top || 0,
        deadline: Date.now() + RESTORE_RETRY_MS,
      }
    : null

const shouldDelaySaveForPendingRestore = (position, pendingRestore) => {
  if (!position || !pendingRestore) return false

  const restoreReached =
    position.top >= pendingRestore.top - RESTORE_TOLERANCE_PX &&
    position.left >= pendingRestore.left - RESTORE_TOLERANCE_PX
  if (restoreReached || Date.now() > pendingRestore.deadline) return false

  return (
    position.top < pendingRestore.top - RESTORE_TOLERANCE_PX ||
    position.left < pendingRestore.left - RESTORE_TOLERANCE_PX
  )
}

const restoreElementScrollPosition = (element, position) => {
  if (!element || !position || typeof window === 'undefined') return
  restoreAcrossLayoutFrames(() => {
    element.scrollLeft = position.left || 0
    element.scrollTop = position.top || 0
  })
}

const restoreWindowScrollPosition = (position) => {
  if (!position || typeof window === 'undefined') return
  restoreAcrossLayoutFrames(() => {
    try {
      window.scrollTo({
        left: position.left || 0,
        top: position.top || 0,
        behavior: 'auto',
      })
    } catch {
      // jsdom does not implement scrollTo; browsers do.
    }
  })
}

const writeElementScrollPosition = (key, element) => {
  if (!key || !element || typeof window === 'undefined') return
  writeScrollPosition(key, getElementScrollPosition(element))
}

export const useDataTableScrollMemory = (viewportRef, storageKey, deps = []) => {
  const latestPositionRef = useRef(null)
  const pendingRestoreRef = useRef(null)

  useEffect(() => {
    if (!storageKey) return undefined
    const element = viewportRef?.current
    if (!element) return undefined

    const storageId = String(storageKey)
    const storedPosition = readScrollPosition(storageId)
    const position = latestPositionRef.current || storedPosition
    if (position) {
      pendingRestoreRef.current = createPendingRestore(position)
      restoreElementScrollPosition(element, position)
    }

    const savePosition = () => {
      const position = getElementScrollPosition(element)
      if (shouldDelaySaveForPendingRestore(position, pendingRestoreRef.current)) return
      pendingRestoreRef.current = null
      latestPositionRef.current = position
      writeElementScrollPosition(storageId, element)
    }
    element.addEventListener('scroll', savePosition, { passive: true })

    return () => {
      element.removeEventListener('scroll', savePosition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportRef, storageKey, ...deps])
}

export const useWindowScrollMemory = (storageKey, deps = []) => {
  const latestPositionRef = useRef(null)
  const pendingRestoreRef = useRef(null)

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return undefined

    const storageId = String(storageKey)
    const storedPosition = readScrollPosition(storageId)
    const position = latestPositionRef.current || storedPosition
    if (position) {
      pendingRestoreRef.current = createPendingRestore(position)
      restoreWindowScrollPosition(position)
    }

    const savePosition = () => {
      const position = getWindowScrollPosition()
      if (shouldDelaySaveForPendingRestore(position, pendingRestoreRef.current)) return
      pendingRestoreRef.current = null
      latestPositionRef.current = position
      writeScrollPosition(storageId, latestPositionRef.current)
    }
    window.addEventListener('scroll', savePosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', savePosition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, ...deps])
}

export default useDataTableScrollMemory
