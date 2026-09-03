import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CCloseButton, CContainer } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { getHandbookAcknowledgementStatus } from '../../views/handbook/api/handbookApi'
import { useGlobalPrompt } from '../global-prompts/GlobalPromptCoordinator'

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  ACKNOWLEDGED: 'acknowledged',
  REQUIRED: 'required',
  UNAVAILABLE: 'unavailable',
}

const getDismissalKey = (staffId, versionId) =>
  staffId && versionId ? `kijo:handbook-acknowledgement:dismissed:${staffId}:${versionId}` : null

const hasDismissedNotice = (staffId, versionId) => {
  const key = getDismissalKey(staffId, versionId)
  if (!key || typeof window === 'undefined') return false
  return window.sessionStorage.getItem(key) === '1'
}

const dismissNoticeForSession = (staffId, versionId) => {
  const key = getDismissalKey(staffId, versionId)
  if (!key || typeof window === 'undefined') return
  window.sessionStorage.setItem(key, '1')
}

const HandbookAcknowledgementNotice = ({ staffId = null }) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState(STATUS.IDLE)
  const [versionLabel, setVersionLabel] = useState('')
  const [versionId, setVersionId] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const latestRequestRef = useRef(0)
  const promptActive = useGlobalPrompt(
    'handbook-acknowledgement',
    100,
    status === STATUS.REQUIRED && !dismissed,
  )

  const loadStatus = useCallback(
    async (signal) => {
      const requestId = latestRequestRef.current + 1
      latestRequestRef.current = requestId
      setStatus(STATUS.LOADING)

      try {
        const result = await getHandbookAcknowledgementStatus({ signal })
        if (requestId !== latestRequestRef.current) {
          return
        }

        if (!result.success) {
          throw new Error(result.message || 'Unable to verify handbook acknowledgement status.')
        }

        const handbookStatus = result.data || {}
        setVersionLabel(handbookStatus.version_label || '')
        setVersionId(handbookStatus.version_id || null)
        setDismissed(
          handbookStatus.acknowledged
            ? false
            : hasDismissedNotice(staffId, handbookStatus.version_id),
        )
        setStatus(handbookStatus.acknowledged ? STATUS.ACKNOWLEDGED : STATUS.REQUIRED)
      } catch (error) {
        if (error?.name === 'AbortError' || requestId !== latestRequestRef.current) {
          return
        }

        setStatus(STATUS.UNAVAILABLE)
      }
    },
    [staffId],
  )

  useEffect(() => {
    if (!staffId) {
      setStatus(STATUS.IDLE)
      setVersionLabel('')
      setVersionId(null)
      setDismissed(false)
      return undefined
    }

    const controller = new AbortController()
    loadStatus(controller.signal)

    const refreshStatus = () => loadStatus()
    window.addEventListener('kijo:handbook-signed', refreshStatus)

    return () => {
      latestRequestRef.current += 1
      controller.abort()
      window.removeEventListener('kijo:handbook-signed', refreshStatus)
    }
  }, [loadStatus, staffId])

  const dismissNotice = () => {
    dismissNoticeForSession(staffId, versionId)
    setDismissed(true)
  }

  const reviewHandbook = () => {
    navigate('/handbook')
  }

  const requiredPromptBlocked = status === STATUS.REQUIRED && !promptActive

  if (
    !staffId ||
    status === STATUS.IDLE ||
    status === STATUS.LOADING ||
    status === STATUS.ACKNOWLEDGED ||
    dismissed ||
    requiredPromptBlocked
  ) {
    return null
  }

  if (status === STATUS.UNAVAILABLE) {
    return (
      <CAlert color="warning" className="mb-0 rounded-0 border-0">
        <CContainer fluid className="px-4 d-flex flex-wrap align-items-center gap-2">
          <strong>Handbook acknowledgement status unavailable.</strong>
          <span className="text-muted">Reload to verify whether action is required.</span>
          <CButton
            size="sm"
            color="warning"
            variant="outline"
            className="ms-auto"
            onClick={() => loadStatus()}
          >
            Retry
          </CButton>
        </CContainer>
      </CAlert>
    )
  }

  const acknowledgementBanner = (
    <CAlert
      color="warning"
      className="mb-0 rounded-0 border-0 app-global-prompt app-global-prompt--handbook"
    >
      <CContainer fluid className="px-4 d-flex flex-wrap align-items-center gap-2">
        <strong>Handbook acknowledgement required.</strong>
        <span className="text-muted d-none d-md-inline">
          Review and sign {versionLabel || 'the current handbook version'} to complete your
          acknowledgement.
        </span>
        <CButton
          size="sm"
          color="warning"
          variant="outline"
          className="ms-auto"
          aria-label="Review & Acknowledge"
          onClick={reviewHandbook}
        >
          <span className="d-none d-md-inline" aria-hidden="true">
            Review &amp; Acknowledge
          </span>
          <span className="d-md-none" aria-hidden="true">
            Review
          </span>
        </CButton>
        <CCloseButton
          aria-label="Dismiss handbook acknowledgement reminder"
          onClick={dismissNotice}
        />
      </CContainer>
    </CAlert>
  )

  return acknowledgementBanner
}

HandbookAcknowledgementNotice.propTypes = {
  staffId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

export default HandbookAcknowledgementNotice
