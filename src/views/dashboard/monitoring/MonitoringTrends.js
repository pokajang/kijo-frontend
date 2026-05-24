import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CButtonGroup, CCol, CRow } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { API_BASE } from '../../marketing/pipeline/pipelineEntryUtils'
import MonitoringSheetCard from './MonitoringSheetCard'
import {
  useChartPalette,
  useChartSemanticColors,
  useChartTickColor,
} from '../../../utils/chartTheme'
import { StatsStrip } from '../../../components/stats'

const trendPeriods = [
  { key: 'last6', label: '6M' },
  { key: 'last12', label: '12M' },
  { key: 'ytd', label: 'YTD' },
]

const stageColumns = [
  { key: 'LEADS', label: 'Leads' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'MEETING/ PITCHING', label: 'Meeting / Pitching' },
  { key: 'PROPOSAL', label: 'Proposal' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'CLOSED', label: 'Closed' },
]

const formatAxisTick = (value) => {
  const numeric = Number(value) || 0
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1)}K`
  return numeric.toLocaleString()
}

const formatCurrency = (value) => `RM ${Number(value || 0).toLocaleString()}`
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`
const normalizeScopeLabel = (value) =>
  String(value || '').replace(
    /\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b/g,
    (month) => month.charAt(0) + month.slice(1).toLowerCase(),
  )

const chartStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
}

const MonitoringTrends = ({
  endDate,
  selectedStaffCode,
  selectedStaffLabel,
  statusData,
  statusLoading = false,
  statusError = '',
  reloadKey = 0,
}) => {
  const tickColor = useChartTickColor()
  const chartColors = useChartSemanticColors()
  const chartPalette = useChartPalette()
  const [trendPeriod, setTrendPeriod] = useState('last6')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadTrends = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchJsonGet(
          `${API_BASE}stats/monitoring-trends`,
          {
            end_date: endDate,
            staff_code: selectedStaffCode,
            trend_period: trendPeriod,
          },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setData(response)
        } else {
          setData(null)
          setError(response?.message || 'Unable to load monitoring trends.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData(null)
        setError(err?.message || 'Unable to load monitoring trends.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadTrends()

    return () => controller.abort()
  }, [endDate, reloadKey, selectedStaffCode, trendPeriod])

  const series = useMemo(() => (Array.isArray(data?.series) ? data.series : []), [data?.series])
  const labels = series.map((row) => row.monthLabel || row.month)
  const scopeLabel = selectedStaffCode ? `Staff: ${selectedStaffLabel}` : 'All staff'
  const totalProposalRm = series.reduce((sum, row) => sum + Number(row.proposalRm || 0), 0)
  const totalProposalQty = series.reduce((sum, row) => sum + Number(row.proposalQty || 0), 0)
  const totalRevenueQty = series.reduce((sum, row) => sum + Number(row.revenueQty || 0), 0)
  const trendWinRate = totalProposalQty > 0 ? (totalRevenueQty / totalProposalQty) * 100 : 0
  const showTrendStats = !loading && !error && series.length > 0
  const targetValue = selectedStaffCode
    ? Number(statusData?.targets?.individual || 0)
    : Number(statusData?.targets?.yearly || 0)
  const ytdRevenueValue = selectedStaffCode
    ? Number(statusData?.yearToDateTotalRm ?? statusData?.totals?.totalRm ?? 0)
    : Number(statusData?.yearToDateCompanyTotalRm ?? statusData?.companyTotalRm ?? 0)
  const targetRemaining = Math.max(targetValue - ytdRevenueValue, 0)
  const achievementPercent = targetValue > 0 ? (ytdRevenueValue / targetValue) * 100 : 0
  const targetScopeLabel = normalizeScopeLabel(
    statusData?.achievementPeriodLabel || `YTD to ${statusData?.monthLabel || '-'}`,
  )
  const trendScopeLabel = data?.periodLabel || 'Trend period'
  const statsItems = useMemo(
    () =>
      [
        targetValue > 0
          ? {
              key: 'ytd-revenue',
              label: selectedStaffCode ? 'YTD Staff Revenue' : 'YTD Revenue',
              value: formatCurrency(ytdRevenueValue),
              sublabel: `${targetScopeLabel} | ${formatPercent(achievementPercent)} of target`,
              tone: achievementPercent < 80 ? 'danger' : 'success',
            }
          : null,
        targetValue > 0
          ? {
              key: 'remaining-target',
              label: 'Remaining Target',
              value: formatCurrency(targetRemaining),
              sublabel: targetScopeLabel,
              tone: targetRemaining > 0 ? 'warning' : 'success',
            }
          : null,
        showTrendStats
          ? {
              key: 'proposal-value',
              label: 'Proposal Value',
              value: formatCurrency(totalProposalRm),
              sublabel: trendScopeLabel,
              tone: 'primary',
            }
          : null,
        showTrendStats
          ? {
              key: 'win-rate',
              label: 'Win Rate',
              value: formatPercent(trendWinRate),
              sublabel: trendScopeLabel,
              tone: 'warning',
            }
          : null,
      ].filter(Boolean),
    [
      achievementPercent,
      selectedStaffCode,
      showTrendStats,
      targetRemaining,
      targetScopeLabel,
      targetValue,
      totalProposalRm,
      trendWinRate,
      trendScopeLabel,
      ytdRevenueValue,
    ],
  )

  const stageDatasets = useMemo(
    () =>
      stageColumns.map((stage, index) => {
        const color = chartPalette[index % chartPalette.length]

        return {
          label: stage.label,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1,
          data: series.map((row) => Number(row.stages?.[stage.key] || 0)),
          maxBarThickness: 38,
        }
      }),
    [chartPalette, series],
  )

  const revenueDatasets = useMemo(
    () => [
      {
        label: 'Proposal RM',
        backgroundColor: chartColors.info,
        borderColor: chartColors.info,
        data: series.map((row) => Number(row.proposalRm || 0)),
        maxBarThickness: 34,
        yAxisID: 'yValue',
      },
      {
        label: 'Revenue RM',
        backgroundColor: chartColors.success,
        borderColor: chartColors.success,
        data: series.map((row) => Number(row.revenueRm || 0)),
        maxBarThickness: 34,
        yAxisID: 'yValue',
      },
      {
        type: 'line',
        label: 'Win rate',
        data: series.map((row) => Number(row.winRate || 0)),
        borderColor: chartColors.warning,
        backgroundColor: chartColors.warning,
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.35,
        yAxisID: 'yRate',
      },
    ],
    [chartColors, series],
  )

  return (
    <MonitoringSheetCard
      title="Monitoring Trends"
      scopeLabel={scopeLabel}
      headerActions={
        <CButtonGroup size="sm" role="group" aria-label="Monitoring trend period">
          {trendPeriods.map((period) => (
            <CButton
              key={period.key}
              type="button"
              size="sm"
              color="primary"
              variant={trendPeriod === period.key ? undefined : 'outline'}
              className="px-2 py-1"
              style={{ fontSize: '0.8rem', lineHeight: 1.1 }}
              data-api-busy-allow="true"
              onClick={() => setTrendPeriod(period.key)}
            >
              {period.label}
            </CButton>
          ))}
        </CButtonGroup>
      }
    >
      <div className="d-flex flex-column gap-4">
        <div data-tour="monitoring-performance-summary">
          {statusError ? <div className="text-danger small mb-2">{statusError}</div> : null}
          <StatsStrip
            items={statsItems}
            loading={statusLoading && !statusData && statsItems.length === 0}
          />
        </div>

        {loading ? (
          <DataTableLoadingState message="Loading trends..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : series.length === 0 ? (
          <div className="text-center text-muted py-4">No trend data available.</div>
        ) : (
          <CRow className="gy-4">
            <CCol xs={12} xl={6}>
              <div className="fw-semibold mb-2">Monthly Pipeline Stages</div>
              <div className="position-relative w-100" style={{ minHeight: '320px' }}>
                <CChartBar
                  style={chartStyle}
                  data={{ labels, datasets: stageDatasets }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          pointStyle: 'circle',
                          boxWidth: 8,
                          boxHeight: 8,
                        },
                      },
                    },
                    scales: {
                      x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: tickColor },
                      },
                      y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                          color: tickColor,
                          maxTicksLimit: 5,
                          callback: (value) => formatAxisTick(value),
                        },
                      },
                    },
                  }}
                />
              </div>
            </CCol>

            <CCol xs={12} xl={6}>
              <div className="fw-semibold mb-2">Proposal vs Revenue</div>
              <div className="position-relative w-100" style={{ minHeight: '320px' }}>
                <CChartBar
                  style={chartStyle}
                  data={{ labels, datasets: revenueDatasets }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          pointStyle: 'circle',
                          boxWidth: 8,
                          boxHeight: 8,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: tickColor },
                      },
                      yValue: {
                        type: 'linear',
                        position: 'left',
                        grid: { display: false },
                        ticks: {
                          color: tickColor,
                          maxTicksLimit: 5,
                          callback: (value) => formatAxisTick(value),
                        },
                      },
                      yRate: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 100,
                        grid: { display: false, drawOnChartArea: false },
                        ticks: {
                          color: tickColor,
                          callback: (value) => `${value}%`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </CCol>
          </CRow>
        )}
      </div>
    </MonitoringSheetCard>
  )
}

export default MonitoringTrends
