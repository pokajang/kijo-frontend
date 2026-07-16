import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CContainer } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { getHandbookAcknowledgementStatus } from '../../views/handbook/api/handbookApi'

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  ACKNOWLEDGED: 'acknowledged',
  REQUIRED: 'required',
  UNAVAILABLE: 'unavailable',
}

const HandbookAcknowledgementNotice = ({ staffId = null }) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState(STATUS.IDLE)
  const [versionLabel, setVersionLabel] = useState('')
  const latestRequestRef = useRef(0)

  const loadStatus = useCallback(async (signal) => {
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

      setVersionLabel(result.data?.version_label || '')
      setStatus(result.data?.acknowledged ? STATUS.ACKNOWLEDGED : STATUS.REQUIRED)
    } catch (error) {
      if (error?.name === 'AbortError' || requestId !== latestRequestRef.current) {
        return
      }

      setStatus(STATUS.UNAVAILABLE)
    }
  }, [])

  useEffect(() => {
    if (!staffId) {
      setStatus(STATUS.IDLE)
      setVersionLabel('')
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

  if (
    !staffId ||
    status === STATUS.IDLE ||
    status === STATUS.LOADING ||
    status === STATUS.ACKNOWLEDGED
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

  return (
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
          onClick={() => navigate('/handbook')}
        >
          Review &amp; Acknowledge
        </CButton>
      </CContainer>
    </CAlert>
  )
}

HandbookAcknowledgementNotice.propTypes = {
  staffId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

export default HandbookAcknowledgementNotice
