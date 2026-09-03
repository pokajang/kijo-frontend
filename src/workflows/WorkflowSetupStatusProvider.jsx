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
import { useAuth } from '../auth/AuthProvider'
import { extractRolesFromSession, hasAnyAllowedRole } from '../utils/roles'
import { runSingleFlight } from '../utils/runSingleFlight'

const WORKFLOW_STATUS_POLL_MS = 5 * 60 * 1000
const WORKFLOW_ROLES = ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank']

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

const statusesEqual = (left, right) => {
  const leftTemplates = left.templates || {}
  const rightTemplates = right.templates || {}
  const leftKeys = Object.keys(leftTemplates)
  const rightKeys = Object.keys(rightTemplates)

  return (
    left.total_missing === right.total_missing &&
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Number(leftTemplates[key]?.missing || 0) === Number(rightTemplates[key]?.missing || 0),
    )
  )
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

const WorkflowSetupStatusProvider = ({ children, enabled = true }) => {
  const [status, setStatus] = useState(EMPTY_STATUS)
  const [isStale, setIsStale] = useState(false)
  const refreshInFlightRef = useRef(null)
  const mountedRef = useRef(false)

  const refreshWorkflowSetupStatus = useCallback(() => {
    if (!enabled) return Promise.resolve()

    return runSingleFlight(refreshInFlightRef, async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE}workflows/setup-status`, {
          credentials: 'include',
        })
        const result = await readJsonResponse(response)
        if (!response.ok || result.status !== 'success') {
          throw new Error(result.message || 'Failed to fetch workflow setup status.')
        }

        const nextStatus = normalizeStatus(result)
        if (!mountedRef.current) return
        setStatus((current) => (statusesEqual(current, nextStatus) ? current : nextStatus))
        setIsStale(false)
      } catch {
        if (mountedRef.current) setIsStale(true)
      }
    })
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStatus(EMPTY_STATUS)
      setIsStale(false)
      return
    }

    refreshWorkflowSetupStatus()
  }, [enabled, refreshWorkflowSetupStatus])

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return undefined

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') refreshWorkflowSetupStatus()
    }
    const intervalId = window.setInterval(refreshWhenVisible, WORKFLOW_STATUS_POLL_MS)

    window.addEventListener('focus', refreshWhenVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [enabled, refreshWorkflowSetupStatus])

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
  enabled: PropTypes.bool,
}

export const RoleAwareWorkflowSetupStatusProvider = ({ children }) => {
  const { user } = useAuth()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const enabled = hasAnyAllowedRole(roles, WORKFLOW_ROLES)

  return <WorkflowSetupStatusProvider enabled={enabled}>{children}</WorkflowSetupStatusProvider>
}

RoleAwareWorkflowSetupStatusProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useWorkflowSetupStatus = () => useContext(WorkflowSetupStatusContext)

export default WorkflowSetupStatusProvider
