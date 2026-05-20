import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value !== 'string') return false

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

const toSearchParams = (search = '') => {
  if (search instanceof URLSearchParams) return search
  return new URLSearchParams(String(search || ''))
}

export const readQuoteRouteParams = (search = '') => {
  const params = toSearchParams(search)

  return {
    quoteId: params.get('quoteId') || '',
    isEditMode: toBoolean(params.get('edit')),
    isRevision: toBoolean(params.get('isRevision')),
    priceExceptionRequestId: params.get('priceExceptionRequestId') || '',
    service: params.get('service') || '',
  }
}

export const readCurrentQuoteRouteParams = () =>
  readQuoteRouteParams(typeof window === 'undefined' ? '' : window.location.search)

export const useQuoteRouteParams = () => {
  const location = useLocation()
  return useMemo(() => readQuoteRouteParams(location.search), [location.search])
}
