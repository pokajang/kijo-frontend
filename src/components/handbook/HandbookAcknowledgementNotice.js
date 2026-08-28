import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCloseButton,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
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

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767.98px)'
const MOBILE_REMINDER_DELAY_MS = 3000

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
  const [isMobile, setIsMobile] = useState(false)
  const [mobileModalVisible, setMobileModalVisible] = useState(false)
  const latestRequestRef = useRef(0)
  const promptActive = useGlobalPrompt(
    'handbook-acknowledgement',
    100,
    status === STATUS.REQUIRED && !dismissed,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
    const updateIsMobile = () => setIsMobile(mediaQuery.matches)

    updateIsMobile()
    mediaQuery.addEventListener('change', updateIsMobile)

    return () => mediaQuery.removeEventListener('change', updateIsMobile)
  }, [])

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

  useEffect(() => {
    if (!isMobile || status !== STATUS.REQUIRED || dismissed || !promptActive) {
      setMobileModalVisible(false)
      return undefined
    }

    const timeoutId = window.setTimeout(() => setMobileModalVisible(true), MOBILE_REMINDER_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [dismissed, isMobile, promptActive, status])

  const dismissNotice = () => {
    dismissNoticeForSession(staffId, versionId)
    setMobileModalVisible(false)
    setDismissed(true)
  }

  const reviewHandbook = () => {
    setMobileModalVisible(false)
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
    <CAlert color="warning" className="mb-0 rounded-0 border-0">
      <CContainer fluid className="px-4 d-flex flex-wrap align-items-center gap-2">
        <strong>Handbook acknowledgement required.</strong>
        <span className="text-muted">
          Review and sign {versionLabel || 'the current handbook version'} to complete your
          acknowledgement.
        </span>
        <CButton
          size="sm"
          color="warning"
          variant="outline"
          className="ms-auto"
          onClick={reviewHandbook}
        >
          Review &amp; Acknowledge
        </CButton>
        <CCloseButton
          aria-label="Dismiss handbook acknowledgement reminder"
          onClick={dismissNotice}
        />
      </CContainer>
    </CAlert>
  )

  if (!isMobile) {
    return acknowledgementBanner
  }

  return (
    <CModal
      alignment="center"
      aria-label="Handbook acknowledgement reminder"
      visible={mobileModalVisible}
      onClose={dismissNotice}
    >
      <CModalHeader closeButton>
        <CModalTitle>Handbook acknowledgement required</CModalTitle>
      </CModalHeader>
      <CModalBody>
        Review and sign {versionLabel || 'the current handbook version'} to complete your
        acknowledgement.
      </CModalBody>
      <CModalFooter className="flex-wrap">
        <CButton color="secondary" variant="outline" onClick={dismissNotice}>
          Later
        </CButton>
        <CButton color="warning" onClick={reviewHandbook}>
          Review &amp; Acknowledge
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

HandbookAcknowledgementNotice.propTypes = {
  staffId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

export default HandbookAcknowledgementNotice
