import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const EMPTY_STATUS = {
  total_missing: 0,
  templates: {},
}

const WorkflowSetupStatusContext = createContext({
  status: EMPTY_STATUS,
  isStale: false,
  refreshWorkflowSetupStatus: () => {},
  getWorkflowSetupTotal: () => 0,
  getWorkflowSetupCount: () => 0,
})

const normalizeStatus = (payload) => {
  const data = payload?.data || {}
  const templates = Object.entries(data.templates || {}).reduce((carry, [key, value]) => {
    carry[key] = {
      missing: Number(value?.missing || 0),
    }
    return carry
  }, {})

  return {
    total_missing: Number(data.total_missing || 0),
    templates,
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

const WorkflowSetupStatusProvider = ({ children }) => {
  const [status, setStatus] = useState(EMPTY_STATUS)
  const [isStale, setIsStale] = useState(false)

  const refreshWorkflowSetupStatus = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}workflows/setup-status`, {
        credentials: 'include',
      })
      const result = await readJsonResponse(response)
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to fetch workflow setup status.')
      }

      setStatus(normalizeStatus(result))
      setIsStale(false)
    } catch {
      setIsStale(true)
    }
  }, [])

  useEffect(() => {
    refreshWorkflowSetupStatus()
  }, [refreshWorkflowSetupStatus])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const refreshFromEvent = () => refreshWorkflowSetupStatus()
    const intervalId = window.setInterval(refreshFromEvent, 60000)

    window.addEventListener('focus', refreshFromEvent)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshFromEvent)
    }
  }, [refreshWorkflowSetupStatus])

  const value = useMemo(
    () => ({
      status,
      isStale,
      refreshWorkflowSetupStatus,
      getWorkflowSetupTotal: () => Number(status.total_missing || 0),
      getWorkflowSetupCount: (templateKey) => Number(status.templates?.[templateKey]?.missing || 0),
    }),
    [isStale, refreshWorkflowSetupStatus, status],
  )

  return (
    <WorkflowSetupStatusContext.Provider value={value}>
      {children}
    </WorkflowSetupStatusContext.Provider>
  )
}

WorkflowSetupStatusProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useWorkflowSetupStatus = () => useContext(WorkflowSetupStatusContext)

export default WorkflowSetupStatusProvider
