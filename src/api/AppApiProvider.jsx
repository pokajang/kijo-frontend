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

  useEffect(() => {
    const controls = Array.from(document.querySelectorAll('button, input[type="submit"]'))
    if (busyCount <= 0) {
      controls.forEach((control) => {
        if (control.dataset.apiBusyDisabled === 'true') {
          control.disabled = false
          delete control.dataset.apiBusyDisabled
        }
      })
      return
    }

    controls.forEach((control) => {
      if (control.disabled || control.dataset.apiBusyAllow === 'true') return
      control.disabled = true
      control.dataset.apiBusyDisabled = 'true'
    })
  }, [busyCount])

  const value = useMemo(() => ({ busy: busyCount > 0 }), [busyCount])

  return <ApiUiContext.Provider value={value}>{children}</ApiUiContext.Provider>
}

export const useApiUi = () => useContext(ApiUiContext)

export default AppApiProvider
