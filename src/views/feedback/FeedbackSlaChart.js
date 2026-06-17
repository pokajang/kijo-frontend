import React, { useMemo } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../components/datatable'
import { useChartSemanticColors, useChartTickColor } from '../../utils/chartTheme'

const DEFAULT_TARGET_PERCENT = 90
const PENDING_BAR_PERCENT = 2

const chartStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
}

const formatPercent = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value).toFixed(1)}%`
}

const normalizePercent = (value, fallback = DEFAULT_TARGET_PERCENT) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const formatTargetPercent = (value) =>
  `${normalizePercent(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`

const slaValueLabelsPlugin = {
  id: 'feedbackSlaValueLabels',
  afterDatasetsDraw: (chart, _args, pluginOptions) => {
    const dataset = chart.data?.datasets?.[0]
    const meta = chart.getDatasetMeta(0)

    if (!dataset || meta.hidden) return

    const { ctx } = chart
    ctx.save()
    ctx.fillStyle = pluginOptions?.color || '#6c757d'
    ctx.font = chart.width < 480 ? '600 10px sans-serif' : '600 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    meta.data.forEach((bar, index) => {
      const label = dataset.valueLabels?.[index] || formatPercent(dataset.data?.[index])
      if (!label || label === '-') return

      const { x, y } = bar.tooltipPosition()
      const minLabelY = (chart.chartArea?.top || 0) + 14
      ctx.fillText(label, x, Math.max(y - 6, minLabelY))
    })

    ctx.restore()
  },
}

const FeedbackSlaChart = ({
  rows = [],
  loading = false,
  error = '',
  year,
  targetPercent = DEFAULT_TARGET_PERCENT,
}) => {
  const tickColor = useChartTickColor()
  const chartColors = useChartSemanticColors()
  const targetValue = normalizePercent(targetPercent)

  const displayRows = useMemo(() => rows.filter((row) => row?.month), [rows])
  const hasRows = displayRows.some((row) => Number(row.reported_count || 0) > 0)
  const labels = displayRows.map((row) => row.month_label || row.month)
  const barValues = displayRows.map((row) => {
    if (row.sla_percent === null || row.sla_percent === undefined) {
      return Number(row.reported_count || 0) > 0 ? PENDING_BAR_PERCENT : null
    }

    return Number(row.sla_percent)
  })
  const valueLabels = displayRows.map((row) => {
    if (row.sla_percent === null || row.sla_percent === undefined) {
      return Number(row.reported_count || 0) > 0 ? 'Pending' : ''
    }

    return formatPercent(row.sla_percent)
  })
  const backgroundColors = displayRows.map((row) => {
    if (!row.is_final) return chartColors.secondary
    return Number(row.sla_percent || 0) >= targetValue ? chartColors.success : chartColors.warning
  })

  const tableRows = displayRows.map((row) => ({
    ...row,
    slaDisplay: formatPercent(row.sla_percent),
  }))

  const tableColumns = [
    { key: 'month_label', label: 'Month', align: 'center' },
    { key: 'reported_count', label: 'Reported', align: 'center' },
    { key: 'eligible_count', label: 'Eligible', align: 'center' },
    { key: 'fixed_under_30_count', label: 'Fixed <=30d', align: 'center' },
    { key: 'missed_30_count', label: 'Missed', align: 'center' },
    { key: 'open_within_window_count', label: 'Open Window', align: 'center' },
    { key: 'slaDisplay', label: 'SLA', align: 'center' },
  ]

  return (
    <CCard className="mt-4">
      <CCardHeader>
        <CRow className="align-items-center gy-2">
          <CCol>
            <strong>30-Day Feedback SLA</strong>{' '}
            <small className="text-muted">Reported month, {year}</small>
          </CCol>
          <CCol xs="auto">
            <span className="small text-muted">Target: {formatTargetPercent(targetValue)}</span>
          </CCol>
        </CRow>
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading feedback SLA..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : !hasRows ? (
          <div className="text-center text-muted py-4">No feedback SLA data available.</div>
        ) : (
          <CRow className="gy-4">
            <CCol xs={12}>
              <div className="position-relative w-100" style={{ minHeight: '320px' }}>
                <CChartBar
                  style={chartStyle}
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'Fixed <=30d SLA',
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors,
                        borderWidth: 1,
                        data: barValues,
                        valueLabels,
                        maxBarThickness: 42,
                      },
                    ],
                  }}
                  plugins={[slaValueLabelsPlugin]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: { top: 24 },
                    },
                    plugins: {
                      feedbackSlaValueLabels: {
                        color: tickColor,
                      },
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: (item) => {
                            const row = displayRows[item?.dataIndex]
                            if (!row) return ''
                            if (row.sla_percent === null || row.sla_percent === undefined) {
                              return Number(row.reported_count || 0) > 0
                                ? 'SLA: Pending window'
                                : 'SLA: -'
                            }

                            return `SLA: ${formatPercent(row.sla_percent)}`
                          },
                          afterBody: (items) => {
                            const row = displayRows[items?.[0]?.dataIndex]
                            if (!row) return []
                            return [
                              `Reported: ${row.reported_count}`,
                              `Eligible: ${row.eligible_count}`,
                              `Fixed <=30d: ${row.fixed_under_30_count}`,
                              `Missed: ${row.missed_30_count}`,
                              `Open within window: ${row.open_within_window_count}`,
                              row.is_final ? 'Final month' : 'Provisional month',
                            ]
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: tickColor },
                      },
                      y: {
                        min: 0,
                        max: 110,
                        grid: { display: false },
                        ticks: {
                          color: tickColor,
                          callback: (value) => (Number(value) <= 100 ? `${value}%` : ''),
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className="d-flex flex-wrap justify-content-center gap-3 small text-muted mt-2">
                <span>
                  <span
                    className="d-inline-block rounded-circle me-1"
                    style={{ width: 10, height: 10, backgroundColor: chartColors.success }}
                  />
                  Green &gt;= target
                </span>
                <span>
                  <span
                    className="d-inline-block rounded-circle me-1"
                    style={{ width: 10, height: 10, backgroundColor: chartColors.warning }}
                  />
                  Amber below target
                </span>
                <span>
                  <span
                    className="d-inline-block rounded-circle me-1"
                    style={{ width: 10, height: 10, backgroundColor: chartColors.secondary }}
                  />
                  Gray provisional
                </span>
              </div>
            </CCol>
            <CCol xs={12}>
              <DataTableEmbeddedList
                rows={tableRows}
                columns={tableColumns}
                getRowKey={(row) => row.month}
                desktopBreakpoint="lg"
                renderMobileItem={(row) => (
                  <div className="data-table-mobile-item">
                    <div className="data-table-mobile-main">
                      <div className="data-table-mobile-title">{row.month_label}</div>
                      <div className="data-table-mobile-subtitle">
                        {row.is_final ? 'Final' : 'Provisional'} | Eligible {row.eligible_count}
                      </div>
                    </div>
                    <div className="data-table-mobile-values">
                      <div className="data-table-mobile-primary">{row.slaDisplay}</div>
                      <div className="data-table-mobile-secondary">
                        {row.fixed_under_30_count}/{row.reported_count} fixed
                      </div>
                    </div>
                  </div>
                )}
              />
            </CCol>
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default FeedbackSlaChart
