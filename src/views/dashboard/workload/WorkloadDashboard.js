import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CCol, CRow, CTooltip } from '@coreui/react'
import {
  RIGHT_DRAWER_IDS,
  useRightDrawer,
} from '../../../components/right-drawer/RightDrawerContext'
import { showToast } from '../../../components/toast/toastService'
import dialog from '../../../components/dialog/dialogService'
import { isAbortError } from '../shared/fetchUtils'
import { createWorkloadShare, fetchWorkload, fetchWorkloadHistory, getWorkloadPdfUrl } from './api'
import { formatDateLocal } from './formatters'
import { WORKLOAD_LOAD_ERROR_MESSAGE } from './constants'
import WorkloadRankingCard from './components/WorkloadRankingCard'
import WorkloadScoreDrawer from './components/WorkloadScoreDrawer'

const WORKLOAD_SCORE_DRAWER_ID = RIGHT_DRAWER_IDS.workloadScore

const buildShareUrl = (path) => {
  const sharePath = String(path || '').startsWith('/') ? String(path || '') : `/${path || ''}`
  const basename = String(import.meta.env.VITE_BASENAME || '/').replace(/\/+$/, '')
  const prefix = basename && basename !== '/' ? basename : ''

  return `${window.location.origin}${prefix}${sharePath}`
}

const formatShareExpiry = (expiresAt) => {
  if (!expiresAt) return ''
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString()
}

const canNativeShareUrl = (shareUrl) => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return true

  try {
    return navigator.canShare({ url: shareUrl })
  } catch {
    return false
  }
}

const shareUrlNative = async ({ shareUrl, expiryText }) => {
  if (!canNativeShareUrl(shareUrl)) return { shared: false }

  try {
    await navigator.share({
      title: 'Workload Dashboard',
      text: expiryText
        ? `Workload dashboard snapshot. Expires ${expiryText}.`
        : 'Workload dashboard snapshot.',
      url: shareUrl,
    })
    return { shared: true }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { shared: false, cancelled: true }
    }
    throw error
  }
}

const copyShareUrl = async (shareUrl) => {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
    return false
  }

  await navigator.clipboard.writeText(shareUrl)
  return true
}

const showShareLinkDialog = async ({ shareUrl, expiryText }) => {
  await dialog.confirm(
    [`Share link created.`, expiryText ? `Expires: ${expiryText}` : '', shareUrl]
      .filter(Boolean)
      .join('\n\n'),
    {
      title: 'Share workload dashboard',
      cancelText: 'OK',
      confirmText: 'Copy link',
      loadingMessage: 'Copying share link...',
      successMessage: 'Share link copied.',
      errorMessage: 'Unable to copy the share link. You can select the full link above.',
      onConfirm: async () => {
        const copied = await copyShareUrl(shareUrl)
        if (!copied) {
          throw new Error('Clipboard copy is not available in this browser.')
        }
        return true
      },
    },
  )
}

const defaultLoadErrorMessage = () => WORKLOAD_LOAD_ERROR_MESSAGE

const useTodayStr = () => {
  const [todayStr, setTodayStr] = useState(() => formatDateLocal(new Date()))

  useEffect(() => {
    const refresh = () => {
      const next = formatDateLocal(new Date())
      setTodayStr((prev) => (prev === next ? prev : next))
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return todayStr
}

const WorkloadDashboard = ({
  startDate,
  endDate,
  fetchRows = fetchWorkload,
  showActions = true,
  enableSharing = true,
  enableHistory = true,
  getLoadErrorMessage = defaultLoadErrorMessage,
}) => {
  const [staffRows, setStaffRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [graphMode, setGraphMode] = useState(false)
  const [historyRows, setHistoryRows] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [selectedScoreStaffKey, setSelectedScoreStaffKey] = useState('')
  const { activeDrawerId, closeRightDrawer, isRightDrawerActive, openRightDrawer } =
    useRightDrawer()
  const todayStr = useTodayStr()
  const isScoreDrawerOpen = isRightDrawerActive(WORKLOAD_SCORE_DRAWER_ID)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const result = await fetchRows({ startDate, endDate, signal: controller.signal })
        if (controller.signal.aborted) return
        const rows = Array.isArray(result) ? result : result?.staffRows || []
        setStaffRows(rows)
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return

        if (!err?.notFound && err?.status !== 404) {
          console.error('[WorkloadDashboard] load failed', err)
        }
        setStaffRows([])
        setSelectedScoreStaffKey('')
        closeRightDrawer(WORKLOAD_SCORE_DRAWER_ID)
        setError(getLoadErrorMessage(err))
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => controller.abort()
  }, [closeRightDrawer, endDate, fetchRows, getLoadErrorMessage, startDate])

  useEffect(() => {
    if (!enableHistory || !graphMode) {
      setHistoryRows([])
      setHistoryLoading(false)
      setHistoryError('')
      return undefined
    }

    const controller = new AbortController()

    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError('')

      try {
        const result = await fetchWorkloadHistory({
          startDate,
          endDate,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setHistoryRows(Array.isArray(result?.staff) ? result.staff : [])
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return

        console.error('[WorkloadDashboard] history load failed', err)
        setHistoryRows([])
        setHistoryError('Unable to load workload history.')
      } finally {
        if (!controller.signal.aborted) {
          setHistoryLoading(false)
        }
      }
    }

    loadHistory()

    return () => controller.abort()
  }, [enableHistory, endDate, graphMode, startDate])

  useEffect(() => {
    if (!selectedScoreStaffKey) return

    const selectedRowExists = staffRows.some((row) => row.staffKey === selectedScoreStaffKey)
    if (!selectedRowExists) {
      setSelectedScoreStaffKey('')
      closeRightDrawer(WORKLOAD_SCORE_DRAWER_ID)
    }
  }, [closeRightDrawer, selectedScoreStaffKey, staffRows])

  useEffect(() => {
    if (activeDrawerId !== WORKLOAD_SCORE_DRAWER_ID && selectedScoreStaffKey) {
      setSelectedScoreStaffKey('')
    }
  }, [activeDrawerId, selectedScoreStaffKey])

  const openScoreDetails = (row) => {
    if (isScoreDrawerOpen && selectedScoreStaffKey === row.staffKey) {
      setSelectedScoreStaffKey('')
      closeRightDrawer(WORKLOAD_SCORE_DRAWER_ID)
      return
    }

    setSelectedScoreStaffKey(row.staffKey)
    openRightDrawer(WORKLOAD_SCORE_DRAWER_ID)
  }

  const openPrintReport = () => {
    window.open(getWorkloadPdfUrl({ startDate, endDate }), '_blank')
  }

  const shareReport = async () => {
    setSharing(true)
    try {
      const result = await createWorkloadShare({ startDate, endDate })
      const shareUrl = buildShareUrl(result.path)
      const expiryText = formatShareExpiry(result.expiresAt)

      try {
        const nativeShare = await shareUrlNative({ shareUrl, expiryText })
        if (nativeShare.shared || nativeShare.cancelled) return
      } catch (nativeShareErr) {
        console.warn('[WorkloadDashboard] native share failed', nativeShareErr)
      }

      try {
        const copied = await copyShareUrl(shareUrl)
        if (copied) {
          showToast(expiryText ? `Share link copied. Expires ${expiryText}` : 'Share link copied.')
          return
        }
      } catch (copyErr) {
        console.warn('[WorkloadDashboard] clipboard copy failed', copyErr)
      }

      await showShareLinkDialog({ shareUrl, expiryText })
    } catch (err) {
      console.error('[WorkloadDashboard] share failed', err)
      await dialog.alert(err?.message || 'Unable to create workload share link.')
    } finally {
      setSharing(false)
    }
  }

  const selectedScoreRow =
    isScoreDrawerOpen && selectedScoreStaffKey
      ? staffRows.find((row) => row.staffKey === selectedScoreStaffKey) || null
      : null
  const historyByStaffKey = useMemo(
    () =>
      Object.fromEntries(
        historyRows
          .map((row) => [String(row.staffKey || ''), row])
          .filter(([staffKey]) => staffKey),
      ),
    [historyRows],
  )

  return (
    <section className="mb-5">
      {error ? (
        <CAlert color="danger" className="mb-4">
          {error}
        </CAlert>
      ) : (
        <div className={`workload-score-layout${selectedScoreRow ? ' is-open' : ''}`}>
          <div className="workload-score-layout-main">
            {showActions ? (
              <div className="d-flex flex-wrap justify-content-end gap-2 mb-3">
                <CTooltip content="Export this workload snapshot as a PDF" placement="top">
                  <span className="d-inline-flex">
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="rounded-2 d-inline-flex align-items-center gap-1 px-2 py-1"
                      style={{ lineHeight: 1.1 }}
                      disabled={loading || staffRows.length === 0 || sharing}
                      onClick={openPrintReport}
                    >
                      Export PDF
                    </CButton>
                  </span>
                </CTooltip>
                {enableHistory ? (
                  <CTooltip
                    content={
                      graphMode ? 'Show workload evidence lists' : 'Show daily workload score graph'
                    }
                    placement="top"
                  >
                    <span className="d-inline-flex">
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        className="rounded-2 d-inline-flex align-items-center gap-1 px-2 py-1"
                        style={{ lineHeight: 1.1 }}
                        disabled={loading || staffRows.length === 0}
                        onClick={() => setGraphMode((current) => !current)}
                      >
                        {graphMode ? 'Evidence' : 'Graph'}
                      </CButton>
                    </span>
                  </CTooltip>
                ) : null}
                {enableSharing ? (
                  <CTooltip content="Create a temporary share link" placement="top">
                    <span className="d-inline-flex">
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        className="rounded-2 d-inline-flex align-items-center gap-1 px-2 py-1"
                        style={{ lineHeight: 1.1 }}
                        disabled={loading || staffRows.length === 0 || sharing}
                        onClick={shareReport}
                      >
                        {sharing ? 'Sharing...' : 'Share'}
                      </CButton>
                    </span>
                  </CTooltip>
                ) : null}
              </div>
            ) : null}
            <CRow className="gy-4 align-items-stretch">
              <CCol xs={12}>
                <WorkloadRankingCard
                  rows={staffRows}
                  loading={loading}
                  todayStr={todayStr}
                  selectedScoreStaffKey={isScoreDrawerOpen ? selectedScoreStaffKey : ''}
                  onOpenScoreDetails={openScoreDetails}
                  graphMode={enableHistory && graphMode}
                  historyByStaffKey={historyByStaffKey}
                  historyLoading={historyLoading}
                  historyError={historyError}
                  startDate={startDate}
                  endDate={endDate}
                />
              </CCol>
            </CRow>
          </div>
          <WorkloadScoreDrawer
            row={selectedScoreRow}
            onClose={() => {
              setSelectedScoreStaffKey('')
              closeRightDrawer(WORKLOAD_SCORE_DRAWER_ID)
            }}
          />
        </div>
      )}
    </section>
  )
}

WorkloadDashboard.propTypes = {
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  fetchRows: PropTypes.func,
  showActions: PropTypes.bool,
  enableSharing: PropTypes.bool,
  enableHistory: PropTypes.bool,
  getLoadErrorMessage: PropTypes.func,
}

export default WorkloadDashboard
