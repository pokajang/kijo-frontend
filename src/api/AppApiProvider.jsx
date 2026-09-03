import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClientEvents } from './apiClient'

const ApiUiContext = createContext({ busy: false })

const AppApiProvider = ({ children }) => {
  const [busyCount, setBusyCount] = useState(0)

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {}
      if (detail.type === 'busy') {
        setBusyCount(Number(detail.count || 0))
      }
    }

    window.addEventListener(apiClientEvents.name, handler)
    return () => window.removeEventListener(apiClientEvents.name, handler)
  }, [])

  const value = useMemo(() => ({ busy: busyCount > 0 }), [busyCount])

  return <ApiUiContext.Provider value={value}>{children}</ApiUiContext.Provider>
}

export const useApiUi = () => useContext(ApiUiContext)

export default AppApiProvider
