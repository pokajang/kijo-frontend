import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCol, CProgress, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'

const formatCurrency = (value) => `RM ${Number(value || 0).toLocaleString()}`

const buildAchievement = (label, targetValue, currentValue, color = 'success') => {
  const target = Number(targetValue || 0)
  const current = Number(currentValue || 0)
  const remaining = Math.max(target - current, 0)
  const percent = target > 0 ? (current / target) * 100 : 0

  return {
    label,
    current,
    target,
    remaining,
    percent,
    color,
  }
}

const AchievementCard = ({ title, achievement }) => {
  if (!achievement) return null

  const achievementPercent = Math.max(0, Math.min(100, Number(achievement.percent || 0)))
  const isBelowThreshold = achievementPercent < 80
  const valueTextClass = isBelowThreshold ? 'text-danger' : ''
  const metaValueTextClass = isBelowThreshold ? 'text-danger' : 'text-muted'

  return (
    <div className="rounded-4 bg-light p-3 h-100">
      <div className="text-uppercase text-muted fw-semibold fs-6 mb-2">{title}</div>
      <div className="d-flex justify-content-between align-items-baseline mb-2">
        <span className="text-muted fw-medium fs-6">{achievement.label}</span>
        <span className={`fw-semibold fs-5 ${valueTextClass}`}>
          {formatCurrency(achievement.current)} / {formatCurrency(achievement.target)}
        </span>
      </div>
      <CProgress
        thin
        color={achievement.color || 'success'}
        value={achievementPercent}
        className="mb-2"
        style={{ height: '4px' }}
      />
      <div className="d-flex justify-content-between align-items-baseline fs-6">
        <span>
          <span className={metaValueTextClass}>{achievementPercent.toFixed(1)}%</span>
          <span className="text-muted"> achieved</span>
        </span>
        <span>
          <span className="text-muted">Remaining: </span>
          <span className={metaValueTextClass}>{formatCurrency(achievement.remaining)}</span>
        </span>
      </div>
    </div>
  )
}

const MonitoringPerformanceSummary = ({
  startDate,
  endDate,
  selectedStaffCode,
  selectedStaffLabel,
  statusData,
  statusLoading,
  statusError,
}) => {
  const hasExternalStatusData =
    statusData !== undefined || statusLoading !== undefined || statusError !== undefined
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (hasExternalStatusData) return undefined

    const controller = new AbortController()

    const loadMonitoringSummary = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monitoring-pipeline-status`,
          {
            start_date: startDate,
            end_date: endDate,
            staff_code: selectedStaffCode,
          },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setData(response)
        } else {
          setData(null)
          setError('Unable to load monitoring performance summary.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData(null)
        setError('Unable to load monitoring performance summary.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonitoringSummary()

    return () => controller.abort()
  }, [startDate, endDate, selectedStaffCode, hasExternalStatusData])

  const displayData = hasExternalStatusData ? statusData : data
  const displayLoading = hasExternalStatusData ? Boolean(statusLoading) : loading
  const displayError = hasExternalStatusData ? statusError || '' : error

  const companyAchievement = displayData?.targets
    ? buildAchievement(
        'YTD company achievement',
        displayData.targets.yearly,
        displayData.yearToDateCompanyTotalRm ?? displayData.companyTotalRm,
        'success',
      )
    : null

  const individualAchievement =
    displayData?.targets && selectedStaffCode
      ? buildAchievement(
          'YTD individual achievement',
          displayData.targets.individual,
          displayData.yearToDateTotalRm ?? displayData.totals?.totalRm,
          'info',
        )
      : null

  return (
    <CCard className="mb-4">
      <CCardBody>
        {displayLoading ? (
          <DataTableLoadingState message="Loading data..." />
        ) : displayError ? (
          <div className="text-center text-danger py-4">{displayError}</div>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-muted">
                <span className="text-uppercase fw-semibold">Awarded Revenue Performance</span>
                <span className="mx-2">|</span>
                <span>
                  {displayData?.achievementPeriodLabel ||
                    `YTD to ${displayData?.monthLabel || '-'}`}
                </span>
                {selectedStaffCode && (
                  <>
                    <span className="mx-2">|</span>
                    <span>Staff: {selectedStaffLabel}</span>
                  </>
                )}
              </div>
            </div>

            {!companyAchievement ? (
              <div className="rounded-4 bg-light px-3 py-3 text-muted">
                No target data available for this scope.
              </div>
            ) : (
              <CRow className="gy-3 align-items-stretch">
                <CCol xs={12} lg={6}>
                  <AchievementCard title="Yearly Target" achievement={companyAchievement} />
                </CCol>
                {individualAchievement && (
                  <CCol xs={12} lg={6}>
                    <AchievementCard
                      title="Individual Target"
                      achievement={individualAchievement}
                    />
                  </CCol>
                )}
              </CRow>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MonitoringPerformanceSummary
