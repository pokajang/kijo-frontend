import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CToast, CToastBody, CToaster } from '@coreui/react'
import { apiClientEvents } from './apiClient'

const ApiUiContext = createContext({ busy: false })

const AppApiProvider = ({ children }) => {
  const [busyCount, setBusyCount] = useState(0)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {}
      if (detail.type === 'busy') {
        setBusyCount(Number(detail.count || 0))
      }
      if (detail.type === 'toast') {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        setToasts((prev) => [
          ...prev,
          { id, color: detail.color || 'danger', message: detail.message },
        ])
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

  return (
    <ApiUiContext.Provider value={value}>
      {children}
      <CToaster placement="top-end" className="p-3">
        {toasts.map((toast) => (
          <CToast
            key={toast.id}
            autohide
            delay={5000}
            color={toast.color}
            visible
            onClose={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
          >
            <CToastBody>{toast.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>
    </ApiUiContext.Provider>
  )
}

export const useApiUi = () => useContext(ApiUiContext)

export default AppApiProvider
