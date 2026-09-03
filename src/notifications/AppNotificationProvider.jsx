import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import PropTypes from 'prop-types'
import { APP_NOTIFICATIONS_CHANGED_EVENT } from './appNotificationEvents'
import { runSingleFlight } from '../utils/runSingleFlight'

const EMPTY_SUMMARY = {
  total: 0,
  listable_total: 0,
  by_module: {},
  by_route_group: {},
  by_tab: {},
}

const AppNotificationContext = createContext({
  summary: EMPTY_SUMMARY,
  isStale: false,
  refresh: () => {},
  getRouteGroupCount: () => 0,
  getTabCount: () => 0,
  getModuleCount: () => 0,
  consumeEntity: async () => 0,
  consumeRouteGroup: async () => 0,
})

const normalizeSummary = (payload) => {
  const data = payload?.data || payload || {}

  return {
    total: Number(data.total || 0),
    // Count of rows the notification list can display (stored rows only).
    // Falls back to total for older payloads that don't send it.
    listable_total: Number(data.listable_total ?? data.total ?? 0),
    by_module: data.by_module || {},
    by_route_group: data.by_route_group || {},
    by_tab: data.by_tab || {},
  }
}

const countMapEquals = (left = {}, right = {}) => {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Number(left[key] || 0) === Number(right[key] || 0))
  )
}

const summariesEqual = (left, right) =>
  left.total === right.total &&
  left.listable_total === right.listable_total &&
  countMapEquals(left.by_module, right.by_module) &&
  countMapEquals(left.by_route_group, right.by_route_group) &&
  countMapEquals(left.by_tab, right.by_tab)

const readJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return {
    status: response.ok ? 'success' : 'error',
    message: response.ok ? '' : `Request failed with HTTP ${response.status}.`,
  }
}

const AppNotificationProvider = ({ children }) => {
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [isStale, setIsStale] = useState(false)
  const refreshInFlightRef = useRef(null)
  const mountedRef = useRef(false)

  const refresh = useCallback(
    () =>
      runSingleFlight(refreshInFlightRef, async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE}notifications/summary`, {
            credentials: 'include',
          })
          const result = await readJsonResponse(response)
          if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Failed to fetch notification summary.')
          }

          const nextSummary = normalizeSummary(result)
          if (!mountedRef.current) return
          setSummary((current) => (summariesEqual(current, nextSummary) ? current : nextSummary))
          setIsStale(false)
        } catch {
          // Keep the last-known summary so badges do not flicker to zero on a
          // transient fetch failure; flag the data as stale for observability.
          if (mountedRef.current) setIsStale(true)
        }
      }),
    [],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const consumeEntity = useCallback(
    async ({ moduleKey, entityType, entityId, routePrefix }) => {
      if (!moduleKey || !entityType || !entityId) return 0

      const response = await fetch(`${import.meta.env.VITE_API_BASE}notifications/consume-entity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          module_key: moduleKey,
          entity_type: entityType,
          entity_id: entityId,
          ...(routePrefix ? { route_prefix: routePrefix } : {}),
        }),
      })
      const result = await readJsonResponse(response)
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to consume notification.')
      }

      await refresh()
      return Number(result.data?.consumed_count || 0)
    },
    [refresh],
  )

  const consumeRouteGroup = useCallback(
    async ({ routePrefix, moduleKeys = [] }) => {
      if (!routePrefix || !moduleKeys.length) return 0

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}notifications/consume-route-group`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            route_prefix: routePrefix,
            module_keys: moduleKeys,
          }),
        },
      )
      const result = await readJsonResponse(response)
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to consume notifications.')
      }

      await refresh()
      return Number(result.data?.consumed_count || 0)
    },
    [refresh],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') refresh()
    }
    const refreshFromEvent = () => refresh()
    const intervalId = window.setInterval(refreshWhenVisible, 60000)

    window.addEventListener('focus', refreshWhenVisible)
    window.addEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, refreshFromEvent)
    window.addEventListener('quote-price-exceptions:changed', refreshFromEvent)
    window.addEventListener('client-vendor-registrations:changed', refreshFromEvent)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
      window.removeEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, refreshFromEvent)
      window.removeEventListener('quote-price-exceptions:changed', refreshFromEvent)
      window.removeEventListener('client-vendor-registrations:changed', refreshFromEvent)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      summary,
      isStale,
      refresh,
      getRouteGroupCount: (route) => Number(summary.by_route_group?.[route] || 0),
      getTabCount: (tabKey) => Number(summary.by_tab?.[tabKey] || 0),
      getModuleCount: (moduleKey) => Number(summary.by_module?.[moduleKey] || 0),
      consumeEntity,
      consumeRouteGroup,
    }),
    [consumeEntity, consumeRouteGroup, isStale, refresh, summary],
  )

  return <AppNotificationContext.Provider value={value}>{children}</AppNotificationContext.Provider>
}

AppNotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAppNotifications = () => useContext(AppNotificationContext)

export default AppNotificationProvider
