import React, { useEffect, useState } from 'react'
import { CToast, CToastBody, CToaster } from '@coreui/react'
import { apiClientEvents } from '../../api/apiClient'
import { getToastDelay, toastEvents } from './toastService'

const createToast = ({ message, color = 'success' }) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  color,
  delay: getToastDelay(color),
  message,
})

const AppToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {}
      if (detail.type !== 'toast' || !detail.message) return
      setToasts((prev) => [...prev, createToast(detail)])
    }

    window.addEventListener(toastEvents.name, handler)
    window.addEventListener(apiClientEvents.name, handler)
    return () => {
      window.removeEventListener(toastEvents.name, handler)
      window.removeEventListener(apiClientEvents.name, handler)
    }
  }, [])

  return (
    <>
      {children}
      <CToaster placement="top-end" className="p-3">
        {toasts.map((toast) => (
          <CToast
            key={toast.id}
            autohide
            delay={toast.delay}
            color={toast.color}
            visible
            onClose={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
          >
            <CToastBody>{toast.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>
    </>
  )
}

export default AppToastProvider
