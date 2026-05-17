import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CBadge, CButton, CFormCheck, CRow, CCol, CTooltip, CWidgetStatsA } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { getMonthIndex, trackerBelongsToKpi } from '../utils/kpiDate'
import { formatScoreNumber, getKpiStatus, getKpiWeightedScore } from '../utils/kpiScore'

const MONTH_REMARK_PREVIEW_HEIGHT = 380

/**
 * Renders the Annual Overview and Monthly Remarks sections.
 */
const ProgressSection = ({
  year,
  monthNames,
  annualOverview,
  loadingAnnual,
  errorAnnual,
  allTrackerData,
  noData,
  onCreateKpi,
}) => {
  const remarkBodyRefs = useRef({})
  const [expandedRemarkMonths, setExpandedRemarkMonths] = useState({})
  const [overflowingRemarkMonths, setOverflowingRemarkMonths] = useState({})
  const [showMonthlyRemarks, setShowMonthlyRemarks] = useState(false)

  const toggleRemarkMonth = (key) => {
    setExpandedRemarkMonths((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const setRemarkBodyRef = useCallback((key, node) => {
    if (node) {
      remarkBodyRefs.current[key] = node
    } else {
      delete remarkBodyRefs.current[key]
    }
  }, [])

  const measureRemarkOverflow = useCallback(() => {
    const next = {}

    Object.entries(remarkBodyRefs.current).forEach(([key, node]) => {
      next[key] = node.scrollHeight > MONTH_REMARK_PREVIEW_HEIGHT + 1
    })

    setOverflowingRemarkMonths((current) => {
      const currentKeys = Object.keys(current)
      const nextKeys = Object.keys(next)
      const isSame =
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === next[key])

      return isSame ? current : next
    })
  }, [])

  // 1) Build remarks per month for all KPIs (defensive date parsing)
  const monthlyParamRemarks = useMemo(() => {
    const buckets = Array.from({ length: 12 }, () => [])
    allTrackerData.forEach(({ for_month, label, remarks }) => {
      const m = getMonthIndex(for_month)
      if (m >= 0 && m <= 11) {
        buckets[m].push({ label, remarks })
      }
    })
    return buckets
  }, [allTrackerData])

  // 2) Determine which months to show in "Monthly Remarks"
  const { lastMonthIndexToShow } = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const selectedYear = Number(year)

    if (selectedYear > currentYear) {
      return { lastMonthIndexToShow: -1 }
    }

    return {
      lastMonthIndexToShow: selectedYear === currentYear ? now.getMonth() : 11,
    }
  }, [year])

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureRemarkOverflow)

    window.addEventListener('resize', measureRemarkOverflow)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', measureRemarkOverflow)
    }
  }, [measureRemarkOverflow, monthlyParamRemarks, lastMonthIndexToShow])

  // 3) Early return when there is no data for the selected year
  //    Still allow error messages to show if present.
  if (noData && !loadingAnnual && !errorAnnual) {
    return (
      <div className="kpi-empty-state text-center text-muted py-5">
        <h6>No KPI data available for {year}</h6>
        {onCreateKpi && (
          <CButton color="primary" size="sm" className="mt-2" onClick={onCreateKpi}>
            Create KPI
          </CButton>
        )}
      </div>
    )
  }

  return (
    <div className="kpi-content-sections">
      <section className="kpi-content-section">
        <div className="kpi-section-title">Annual Overview ({year})</div>
        {loadingAnnual && <DataTableLoadingState message="Loading annual overview..." />}
        {errorAnnual && <p className="text-danger">{errorAnnual}</p>}

        {!loadingAnnual && annualOverview.length === 0 && !errorAnnual && (
          <p className="text-muted mb-0">No annual data to display.</p>
        )}

        {!loadingAnnual && annualOverview.length > 0 && (
          <CRow>
            {annualOverview.map((kpi) => {
              const score = getKpiWeightedScore(kpi)
              const { current, target, weightage, earnedWeight } = score
              const { badgeColor, statusLabel } = getKpiStatus(score.achievementPct)

              const monthlyValues = Array(12).fill(null)
              allTrackerData.forEach((row) => {
                if (!trackerBelongsToKpi(row, { value: kpi.id, label: kpi.label })) return

                const monthIdx = getMonthIndex(row.for_month)
                if (monthIdx >= 0 && monthIdx <= 11) {
                  monthlyValues[monthIdx] = row.actual_value ?? null
                }
              })

              return (
                <CCol xs={12} lg={6} xl={4} key={kpi.id}>
                  <CWidgetStatsA
                    className="kpi-overview-widget mb-3"
                    action={<CBadge color={badgeColor}>{statusLabel}</CBadge>}
                    value={
                      <span className={`fw-bold text-${badgeColor}`}>
                        {current} / {target}{' '}
                        <span className="fs-6 fw-normal text-body-secondary">{kpi.unit}</span>
                      </span>
                    }
                    title={
                      <div className="kpi-overview-widget-title">
                        <CTooltip content={kpi.label} placement="right">
                          <span className="kpi-overview-widget-name" tabIndex={0}>
                            {kpi.label}
                          </span>
                        </CTooltip>
                      </div>
                    }
                    chart={
                      <>
                        {weightage > 0 && (
                          <div className="kpi-widget-score-meta px-3">
                            <span>
                              Score{' '}
                              <strong>
                                {formatScoreNumber(earnedWeight)} / {formatScoreNumber(weightage)}
                              </strong>
                            </span>
                            <span>
                              Weight <strong>{formatScoreNumber(weightage)}%</strong>
                            </span>
                          </div>
                        )}
                        <div className="kpi-widget-months px-3 pb-3">
                          {monthlyValues.map((value, index) => {
                            if (index > lastMonthIndexToShow) return null

                            return (
                              <div
                                key={monthNames[index]}
                                className={`kpi-widget-month-cell${
                                  value == null ? ' is-empty' : ''
                                }`}
                              >
                                <span>{monthNames[index]}</span>
                                <strong>{value ?? '-'}</strong>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    }
                  />
                </CCol>
              )
            })}
          </CRow>
        )}
      </section>

      <section className="kpi-content-section kpi-remarks-section">
        <div className="kpi-section-title kpi-remarks-title">
          <span>Monthly Remarks ({year})</span>
          <CFormCheck
            id="kpi-show-monthly-remarks"
            label="Show monthly remarks"
            checked={showMonthlyRemarks}
            onChange={(e) => setShowMonthlyRemarks(e.target.checked)}
          />
        </div>
        {showMonthlyRemarks && (
          <div className="kpi-remarks-months mt-3">
            {monthNames.map((m, i) => {
              if (i > lastMonthIndexToShow) return null
              const items = monthlyParamRemarks[i]
              const isExpanded = Boolean(expandedRemarkMonths[m])
              const canExpand = items.length > 0 && Boolean(overflowingRemarkMonths[m])
              return (
                <section
                  key={m}
                  className={`kpi-remarks-month-card${canExpand ? ' is-expandable' : ''}${
                    isExpanded ? ' is-expanded' : ''
                  }`}
                >
                  <div className="kpi-remarks-month-header">
                    <span>{m}</span>
                    {canExpand && (
                      <CButton
                        color="link"
                        size="sm"
                        className="kpi-remarks-month-toggle p-0"
                        onClick={() => toggleRemarkMonth(m)}
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </CButton>
                    )}
                  </div>
                  {items.length > 0 ? (
                    <div ref={(node) => setRemarkBodyRef(m, node)} className="kpi-remark-list">
                      {items.map((it, idx) => (
                        <article key={`${m}-${it.label}-${idx}`} className="kpi-remark-item">
                          <div className="kpi-remark-title">{it.label}</div>
                          <div className="kpi-remark-text">{it.remarks || '-'}</div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="kpi-remarks-empty">-</div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default ProgressSection
