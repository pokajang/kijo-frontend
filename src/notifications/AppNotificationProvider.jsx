import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { APP_NOTIFICATIONS_CHANGED_EVENT } from './appNotificationEvents'

const EMPTY_SUMMARY = {
  total: 0,
  by_module: {},
  by_route_group: {},
  by_tab: {},
}

const AppNotificationContext = createContext({
  summary: EMPTY_SUMMARY,
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
    by_module: data.by_module || {},
    by_route_group: data.by_route_group || {},
    by_tab: data.by_tab || {},
  }
}

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

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}notifications/summary`, {
        credentials: 'include',
      })
      const result = await readJsonResponse(response)
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to fetch notification summary.')
      }
      setSummary(normalizeSummary(result))
    } catch {
      setSummary(EMPTY_SUMMARY)
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

    const refreshFromEvent = () => refresh()
    const intervalId = window.setInterval(refreshFromEvent, 60000)

    window.addEventListener('focus', refreshFromEvent)
    window.addEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, refreshFromEvent)
    window.addEventListener('quote-price-exceptions:changed', refreshFromEvent)
    window.addEventListener('client-vendor-registrations:changed', refreshFromEvent)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshFromEvent)
      window.removeEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, refreshFromEvent)
      window.removeEventListener('quote-price-exceptions:changed', refreshFromEvent)
      window.removeEventListener('client-vendor-registrations:changed', refreshFromEvent)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      summary,
      refresh,
      getRouteGroupCount: (route) => Number(summary.by_route_group?.[route] || 0),
      getTabCount: (tabKey) => Number(summary.by_tab?.[tabKey] || 0),
      getModuleCount: (moduleKey) => Number(summary.by_module?.[moduleKey] || 0),
      consumeEntity,
      consumeRouteGroup,
    }),
    [consumeEntity, consumeRouteGroup, refresh, summary],
  )

  return <AppNotificationContext.Provider value={value}>{children}</AppNotificationContext.Provider>
}

AppNotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAppNotifications = () => useContext(AppNotificationContext)

export default AppNotificationProvider
