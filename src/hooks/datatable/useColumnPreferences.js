import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeVisibleColumns } from '../../utils/datatable/columnVisibility'

export const useColumnPreferences = ({
  storageKey,
  apiKey,
  defaultVisibleColumns = {},
  requiredColumns = new Set(),
  apiBase = import.meta.env.VITE_API_BASE,
} = {}) => {
  const defaultColumnsKey = JSON.stringify(defaultVisibleColumns)
  const requiredColumnsKey = JSON.stringify([...requiredColumns])
  const stableDefaultVisibleColumns = useMemo(
    () => defaultVisibleColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultColumnsKey],
  )
  const stableRequiredColumns = useMemo(
    () => requiredColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requiredColumnsKey],
  )
  const [visibleColumns, setVisibleColumns] = useState(stableDefaultVisibleColumns)
  const [columnPrefsHydrated, setColumnPrefsHydrated] = useState(false)
  const lastSyncedColumnsRef = useRef('')

  useEffect(() => {
    let isActive = true

    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (isActive) {
            setVisibleColumns(
              normalizeVisibleColumns(parsed, stableDefaultVisibleColumns, stableRequiredColumns),
            )
          }
        }
      } catch {
        // ignore malformed local storage payload
      }
    }

    const loadPreference = async () => {
      if (!apiKey || !apiBase) {
        if (isActive) setColumnPrefsHydrated(true)
        return
      }

      try {
        const res = await fetch(`${apiBase}staff/preferences/${encodeURIComponent(apiKey)}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok || !isActive) return

        const payload = await res.json().catch(() => null)
        const normalized = normalizeVisibleColumns(
          payload?.data?.value,
          stableDefaultVisibleColumns,
          stableRequiredColumns,
        )
        setVisibleColumns(normalized)
        lastSyncedColumnsRef.current = JSON.stringify(normalized)
      } catch {
        // keep local fallback silently
      } finally {
        if (isActive) setColumnPrefsHydrated(true)
      }
    }

    loadPreference()

    return () => {
      isActive = false
    }
  }, [apiBase, apiKey, stableDefaultVisibleColumns, stableRequiredColumns, storageKey])

  useEffect(() => {
    if (!storageKey) return

    const normalized = normalizeVisibleColumns(
      visibleColumns,
      stableDefaultVisibleColumns,
      stableRequiredColumns,
    )
    try {
      localStorage.setItem(storageKey, JSON.stringify(normalized))
    } catch {
      // ignore storage failures
    }
  }, [stableDefaultVisibleColumns, stableRequiredColumns, storageKey, visibleColumns])

  useEffect(() => {
    if (!columnPrefsHydrated || !apiKey || !apiBase) return

    const normalized = normalizeVisibleColumns(
      visibleColumns,
      stableDefaultVisibleColumns,
      stableRequiredColumns,
    )
    const payloadString = JSON.stringify(normalized)
    if (payloadString === lastSyncedColumnsRef.current) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase}staff/preferences/${encodeURIComponent(apiKey)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: normalized }),
          signal: controller.signal,
        })
        if (!res.ok) return
        lastSyncedColumnsRef.current = payloadString
      } catch {
        // keep local value; will retry on next change
      }
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [
    apiBase,
    apiKey,
    columnPrefsHydrated,
    stableDefaultVisibleColumns,
    stableRequiredColumns,
    visibleColumns,
  ])

  const isColumnVisible = (key) => {
    if (stableRequiredColumns.has(key)) return true
    return visibleColumns[key] !== false
  }

  const toggleColumnVisibility = (key) => {
    if (stableRequiredColumns.has(key)) return
    setVisibleColumns((prev) => ({ ...prev, [key]: prev[key] === false }))
  }

  const resetColumnVisibility = () => {
    setVisibleColumns(
      normalizeVisibleColumns(
        stableDefaultVisibleColumns,
        stableDefaultVisibleColumns,
        stableRequiredColumns,
      ),
    )
  }

  return {
    visibleColumns,
    setVisibleColumns,
    isColumnVisible,
    toggleColumnVisibility,
    resetColumnVisibility,
    columnPrefsHydrated,
  }
}

export default useColumnPreferences
