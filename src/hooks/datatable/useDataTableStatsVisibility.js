import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DATA_TABLE_STATS_VISIBILITY_PREFIX = 'datatable.stats-visible.'
const DATA_TABLE_STATS_VISIBILITY_VERSION = '.v1'
const DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY = `${DATA_TABLE_STATS_VISIBILITY_PREFIX}systemwide${DATA_TABLE_STATS_VISIBILITY_VERSION}`
const DATA_TABLE_STATS_VISIBILITY_EVENT = 'datatable:stats-visibility-change'
const DATA_TABLE_STATS_VISIBILITY_API_PREFIX = 'datatable-stats-visible.'
const DATA_TABLE_STATS_SYSTEMWIDE_API_KEY = `${DATA_TABLE_STATS_VISIBILITY_API_PREFIX}systemwide${DATA_TABLE_STATS_VISIBILITY_VERSION}`
const DATA_TABLE_CONTROLS_VISIBILITY_PREFIX = 'datatable.controls-visible.'
const DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY = `${DATA_TABLE_CONTROLS_VISIBILITY_PREFIX}systemwide${DATA_TABLE_STATS_VISIBILITY_VERSION}`
const DATA_TABLE_CONTROLS_VISIBILITY_API_PREFIX = 'datatable-controls-visible.'
const DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY = `${DATA_TABLE_CONTROLS_VISIBILITY_API_PREFIX}systemwide${DATA_TABLE_STATS_VISIBILITY_VERSION}`

const getBrowserLocalStorage = () => {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch (_err) {
    return null
  }
}

const buildDataTableStatsVisibilityStorageKey = (storageKey) =>
  storageKey
    ? `${DATA_TABLE_STATS_VISIBILITY_PREFIX}${storageKey}${DATA_TABLE_STATS_VISIBILITY_VERSION}`
    : ''

const buildDataTableStatsVisibilityApiKey = (storageKey) =>
  storageKey
    ? `${DATA_TABLE_STATS_VISIBILITY_API_PREFIX}${storageKey}${DATA_TABLE_STATS_VISIBILITY_VERSION}`
    : ''

const buildDataTableControlsVisibilityStorageKey = (storageKey) =>
  storageKey
    ? `${DATA_TABLE_CONTROLS_VISIBILITY_PREFIX}${storageKey}${DATA_TABLE_STATS_VISIBILITY_VERSION}`
    : ''

const buildDataTableControlsVisibilityApiKey = (storageKey) =>
  storageKey
    ? `${DATA_TABLE_CONTROLS_VISIBILITY_API_PREFIX}${storageKey}${DATA_TABLE_STATS_VISIBILITY_VERSION}`
    : ''

const readBooleanStorageValue = (storage, storageKey, fallback) => {
  try {
    const storedValue = storage.getItem(storageKey)
    if (storedValue == null) return fallback

    const parsedValue = JSON.parse(storedValue)
    return typeof parsedValue === 'boolean' ? parsedValue : fallback
  } catch (_err) {
    return fallback
  }
}

const readDisplayVisibility = (storageKey, systemwideStorageKey, defaultVisible) => {
  const fallback = Boolean(defaultVisible)
  const storage = getBrowserLocalStorage()
  if (!storage || !storageKey) return fallback

  const systemwideValue = readBooleanStorageValue(storage, systemwideStorageKey, undefined)
  const pageFallback = typeof systemwideValue === 'boolean' ? systemwideValue : fallback
  return readBooleanStorageValue(storage, storageKey, pageFallback)
}

const readStatsVisibility = (storageKey, defaultVisible) =>
  readDisplayVisibility(storageKey, DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, defaultVisible)

const readControlsVisibility = (storageKey, defaultVisible) =>
  readDisplayVisibility(storageKey, DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY, defaultVisible)

const removeStatsVisibility = (storageKey) => {
  const storage = getBrowserLocalStorage()
  if (!storage || !storageKey) return

  try {
    storage.removeItem(storageKey)
  } catch (_err) {
    // Ignore unavailable storage; the UI preference still works for this render session.
  }
}

const removePageVisibilityOverrides = (visibilityPrefix, systemwideStorageKey) => {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    const keysToRemove = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (
        key &&
        key.startsWith(visibilityPrefix) &&
        key.endsWith(DATA_TABLE_STATS_VISIBILITY_VERSION) &&
        key !== systemwideStorageKey
      ) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key))
  } catch (_err) {
    // Ignore unavailable storage; the UI preference still works for this render session.
  }
}

const removePageStatsVisibilityOverrides = () =>
  removePageVisibilityOverrides(
    DATA_TABLE_STATS_VISIBILITY_PREFIX,
    DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY,
  )

const removePageControlsVisibilityOverrides = () =>
  removePageVisibilityOverrides(
    DATA_TABLE_CONTROLS_VISIBILITY_PREFIX,
    DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY,
  )

const writeStatsVisibility = (storageKey, visible) => {
  const storage = getBrowserLocalStorage()
  if (!storage || !storageKey) return

  try {
    storage.setItem(storageKey, JSON.stringify(Boolean(visible)))
  } catch (_err) {
    // Ignore unavailable storage; the UI preference still works for this render session.
  }
}

const writeSystemwideStatsVisibility = (visible) => {
  removePageStatsVisibilityOverrides()
  writeStatsVisibility(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, visible)
}

const writeSystemwideControlsVisibility = (visible) => {
  removePageControlsVisibilityOverrides()
  writeStatsVisibility(DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY, visible)
}

const readPreferencePayload = (payload) => {
  const visible = payload?.data?.value?.visible

  return {
    found: payload?.data?.found === true,
    visible: typeof visible === 'boolean' ? visible : null,
  }
}

const fetchStatsVisibilityPreference = async (apiBase, apiKey) => {
  if (!apiBase || !apiKey || typeof fetch !== 'function') return null

  try {
    const res = await fetch(`${apiBase}staff/preferences/${encodeURIComponent(apiKey)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null

    const payload = await res.json().catch(() => null)
    return readPreferencePayload(payload)
  } catch (_err) {
    return null
  }
}

const writeStatsVisibilityPreference = async (apiBase, apiKey, visible) => {
  if (!apiBase || !apiKey || typeof fetch !== 'function') return

  try {
    await fetch(`${apiBase}staff/preferences/${encodeURIComponent(apiKey)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: { visible: Boolean(visible) } }),
    })
  } catch (_err) {
    // Keep the local preference; backend sync can succeed on a later toggle.
  }
}

const dispatchStatsVisibilityChange = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return

  window.dispatchEvent(new Event(DATA_TABLE_STATS_VISIBILITY_EVENT))
}

const useDataTableStatsVisibility = (
  storageKey,
  defaultVisible = true,
  { apiBase = import.meta.env.VITE_API_BASE } = {},
) => {
  const fullStorageKey = useMemo(
    () => buildDataTableStatsVisibilityStorageKey(storageKey),
    [storageKey],
  )
  const fullControlsStorageKey = useMemo(
    () => buildDataTableControlsVisibilityStorageKey(storageKey),
    [storageKey],
  )
  const preferenceApiKey = useMemo(
    () => buildDataTableStatsVisibilityApiKey(storageKey),
    [storageKey],
  )
  const controlsPreferenceApiKey = useMemo(
    () => buildDataTableControlsVisibilityApiKey(storageKey),
    [storageKey],
  )
  const normalizedDefault = Boolean(defaultVisible)
  const localChangeVersionRef = useRef(0)
  const localControlsChangeVersionRef = useRef(0)
  const [statsVisible, setStatsVisible] = useState(() =>
    readStatsVisibility(fullStorageKey, normalizedDefault),
  )
  const [controlsVisible, setControlsVisible] = useState(() =>
    readControlsVisibility(fullControlsStorageKey, normalizedDefault),
  )

  useEffect(() => {
    setStatsVisible(readStatsVisibility(fullStorageKey, normalizedDefault))
    setControlsVisible(readControlsVisibility(fullControlsStorageKey, normalizedDefault))
  }, [fullControlsStorageKey, fullStorageKey, normalizedDefault])

  useEffect(() => {
    let isActive = true

    const loadPreference = async () => {
      if (!apiBase || !preferenceApiKey) return

      const loadVersion = localChangeVersionRef.current
      const [systemwidePreference, pagePreference] = await Promise.all([
        fetchStatsVisibilityPreference(apiBase, DATA_TABLE_STATS_SYSTEMWIDE_API_KEY),
        fetchStatsVisibilityPreference(apiBase, preferenceApiKey),
      ])
      if (!isActive || loadVersion !== localChangeVersionRef.current) return

      if (pagePreference?.found && typeof pagePreference.visible === 'boolean') {
        writeStatsVisibility(fullStorageKey, pagePreference.visible)
        setStatsVisible(pagePreference.visible)
        return
      }

      if (systemwidePreference?.found && typeof systemwidePreference.visible === 'boolean') {
        removeStatsVisibility(fullStorageKey)
        writeStatsVisibility(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, systemwidePreference.visible)
        setStatsVisible(systemwidePreference.visible)
      }
    }

    loadPreference()

    return () => {
      isActive = false
    }
  }, [apiBase, fullStorageKey, preferenceApiKey])

  useEffect(() => {
    let isActive = true

    const loadPreference = async () => {
      if (!apiBase || !controlsPreferenceApiKey) return

      const loadVersion = localControlsChangeVersionRef.current
      const [systemwidePreference, pagePreference] = await Promise.all([
        fetchStatsVisibilityPreference(apiBase, DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY),
        fetchStatsVisibilityPreference(apiBase, controlsPreferenceApiKey),
      ])
      if (!isActive || loadVersion !== localControlsChangeVersionRef.current) return

      if (pagePreference?.found && typeof pagePreference.visible === 'boolean') {
        writeStatsVisibility(fullControlsStorageKey, pagePreference.visible)
        setControlsVisible(pagePreference.visible)
        return
      }

      if (systemwidePreference?.found && typeof systemwidePreference.visible === 'boolean') {
        removeStatsVisibility(fullControlsStorageKey)
        writeStatsVisibility(
          DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY,
          systemwidePreference.visible,
        )
        setControlsVisible(systemwidePreference.visible)
      }
    }

    loadPreference()

    return () => {
      isActive = false
    }
  }, [apiBase, controlsPreferenceApiKey, fullControlsStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const refreshStatsVisible = () => {
      setStatsVisible(readStatsVisibility(fullStorageKey, normalizedDefault))
      setControlsVisible(readControlsVisibility(fullControlsStorageKey, normalizedDefault))
    }

    const refreshStatsVisibleFromStorage = (event) => {
      if (
        event.key == null ||
        event.key === DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY ||
        event.key === fullStorageKey ||
        event.key === DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY ||
        event.key === fullControlsStorageKey
      ) {
        refreshStatsVisible()
      }
    }

    window.addEventListener(DATA_TABLE_STATS_VISIBILITY_EVENT, refreshStatsVisible)
    window.addEventListener('storage', refreshStatsVisibleFromStorage)
    return () => {
      window.removeEventListener(DATA_TABLE_STATS_VISIBILITY_EVENT, refreshStatsVisible)
      window.removeEventListener('storage', refreshStatsVisibleFromStorage)
    }
  }, [fullControlsStorageKey, fullStorageKey, normalizedDefault])

  const toggleStatsVisible = useCallback(
    (scope = 'page') => {
      const nextVisible = !statsVisible
      localChangeVersionRef.current += 1

      if (scope === 'systemwide') {
        writeSystemwideStatsVisibility(nextVisible)
        writeStatsVisibilityPreference(apiBase, DATA_TABLE_STATS_SYSTEMWIDE_API_KEY, nextVisible)
      } else {
        writeStatsVisibility(fullStorageKey, nextVisible)
        writeStatsVisibilityPreference(apiBase, preferenceApiKey, nextVisible)
      }

      setStatsVisible(nextVisible)
      dispatchStatsVisibilityChange()
    },
    [apiBase, fullStorageKey, preferenceApiKey, statsVisible],
  )

  const toggleControlsVisible = useCallback(
    (scope = 'page') => {
      const nextVisible = !controlsVisible
      localControlsChangeVersionRef.current += 1

      if (scope === 'systemwide') {
        writeSystemwideControlsVisibility(nextVisible)
        writeStatsVisibilityPreference(apiBase, DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY, nextVisible)
      } else {
        writeStatsVisibility(fullControlsStorageKey, nextVisible)
        writeStatsVisibilityPreference(apiBase, controlsPreferenceApiKey, nextVisible)
      }

      setControlsVisible(nextVisible)
      dispatchStatsVisibilityChange()
    },
    [apiBase, controlsPreferenceApiKey, controlsVisible, fullControlsStorageKey],
  )

  return {
    statsVisible,
    setStatsVisible,
    toggleStatsVisible,
    controlsVisible,
    setControlsVisible,
    toggleControlsVisible,
  }
}

export {
  DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY,
  DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY,
  DATA_TABLE_STATS_VISIBILITY_EVENT,
  DATA_TABLE_STATS_SYSTEMWIDE_API_KEY,
  DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY,
  buildDataTableControlsVisibilityApiKey,
  buildDataTableControlsVisibilityStorageKey,
  buildDataTableStatsVisibilityApiKey,
  buildDataTableStatsVisibilityStorageKey,
  readControlsVisibility,
  readStatsVisibility,
}
export default useDataTableStatsVisibility
