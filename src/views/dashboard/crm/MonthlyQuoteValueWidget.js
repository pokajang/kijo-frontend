import React, { useState, useEffect } from 'react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CFormCheck,
} from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'
import { useChartSemanticColors, useChartTickColor } from '../../../utils/chartTheme'

// helper to format YYYY-MM to "Mon YYYY"
const formatMonthLabel = (ym) => {
  const [y, m] = ym.split('-')
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

const formatAxisTick = (value) => {
  const numeric = Number(value) || 0
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1)}K`
  return numeric.toLocaleString()
}

const MonthlyQuoteValueWidget = ({ period, startDate, endDate }) => {
  const tickColor = useChartTickColor()
  const chartColors = useChartSemanticColors()
  const [monthlyQuotes, setMonthlyQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showValueSeries, setShowValueSeries] = useState(true)
  const [showCountSeries, setShowCountSeries] = useState(true)

  // refetch whenever period changes
  useEffect(() => {
    const controller = new AbortController()

    const loadMonthlyQuotes = async () => {
      setLoading(true)
      setError('')

      try {
        const [valueRes, countRes] = await Promise.all([
          fetchJsonGet(
            `${import.meta.env.VITE_API_BASE}stats/monthly-quote-value`,
            { period, start_date: startDate, end_date: endDate },
            controller.signal,
          ),
          fetchJsonGet(
            `${import.meta.env.VITE_API_BASE}stats/monthly-quote-count`,
            { period, start_date: startDate, end_date: endDate },
            controller.signal,
          ),
        ])

        const valueRows =
          valueRes?.status === 'success' && Array.isArray(valueRes.monthlyQuoteValue)
            ? valueRes.monthlyQuoteValue
            : null
        const countRows =
          countRes?.status === 'success' && Array.isArray(countRes.monthlyQuoteCount)
            ? countRes.monthlyQuoteCount
            : null

        if (valueRows && countRows) {
          const valueByMonth = new Map(valueRows.map((row) => [row.month, Number(row.amount) || 0]))
          const countByMonth = new Map(countRows.map((row) => [row.month, Number(row.count) || 0]))
          const months = Array.from(
            new Set([...valueByMonth.keys(), ...countByMonth.keys()]),
          ).sort()

          const merged = months.map((month) => ({
            month,
            amount: valueByMonth.get(month) || 0,
            count: countByMonth.get(month) || 0,
          }))

          setMonthlyQuotes(merged)
        } else {
          setMonthlyQuotes([])
          setError('Unable to load quotation value and count statistics.')
        }

        if (controller.signal.aborted) return
      } catch (err) {
        if (isAbortError(err)) return
        setMonthlyQuotes([])
        setError('Unable to load quotation value and count statistics.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonthlyQuotes()

    return () => controller.abort()
  }, [period, startDate, endDate])

  // build labels & data
  const labels = monthlyQuotes.map((mq) => formatMonthLabel(mq.month))
  const valuePoints = monthlyQuotes.map((mq) => Number(mq.amount) || 0)
  const countPoints = monthlyQuotes.map((mq) => Number(mq.count) || 0)
  const periodTotal = valuePoints.reduce((sum, value) => sum + value, 0)
  const periodCountTotal = countPoints.reduce((sum, value) => sum + value, 0)
  const showDetailTable = monthlyQuotes.length > 1 && (showValueSeries || showCountSeries)
  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)

  const shouldScrollTable = monthlyQuotes.length > 12
  const detailColumns = [
    { key: 'month', label: 'Month', render: (row) => formatMonthLabel(row.month) },
    ...(showValueSeries
      ? [
          {
            key: 'amount',
            label: 'Value (RM)',
            align: 'end',
            render: (row) => row.amount.toLocaleString(),
          },
        ]
      : []),
    ...(showCountSeries
      ? [
          {
            key: 'count',
            label: 'Quotes',
            align: 'end',
            render: (row) => row.count.toLocaleString(),
          },
        ]
      : []),
  ]
  const detailFooterRows = [
    {
      key: 'total',
      className: 'fw-semibold text-muted',
      cells: [
        { key: 'label', content: 'Total', className: 'text-muted' },
        ...(showValueSeries
          ? [
              {
                key: 'value',
                content: periodTotal.toLocaleString(),
                align: 'end',
                className: 'text-muted',
              },
            ]
          : []),
        ...(showCountSeries
          ? [
              {
                key: 'count',
                content: periodCountTotal.toLocaleString(),
                align: 'end',
                className: 'text-muted',
              },
            ]
          : []),
      ],
    },
  ]
  const handleSeriesToggle = (series, checked) => {
    if (!checked) {
      const activeCount = Number(showValueSeries) + Number(showCountSeries)
      if (activeCount === 1) return
    }

    if (series === 'value') setShowValueSeries(checked)
    if (series === 'count') setShowCountSeries(checked)
  }

  const chartDatasets = [
    ...(showValueSeries
      ? [
          {
            label: 'Quote Value (RM)',
            backgroundColor: 'transparent',
            borderColor: chartColors.primary,
            pointBackgroundColor: chartColors.primary,
            data: valuePoints,
            yAxisID: 'yValue',
          },
        ]
      : []),
    ...(showCountSeries
      ? [
          {
            label: 'Quote Count',
            backgroundColor: 'transparent',
            borderColor: chartColors.warning,
            pointBackgroundColor: chartColors.warning,
            data: countPoints,
            yAxisID: 'yCount',
          },
        ]
      : []),
  ]

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>Monthly Quote Value &amp; Count</strong>
        </div>
        <div className="d-none d-md-flex align-items-center gap-3">
          <CFormCheck
            id="toggleQuoteValueSeries"
            label="Value"
            checked={showValueSeries}
            onChange={(e) => handleSeriesToggle('value', e.target.checked)}
            disabled={showValueSeries && !showCountSeries}
          />
          <CFormCheck
            id="toggleQuoteCountSeries"
            label="Quotes"
            checked={showCountSeries}
            onChange={(e) => handleSeriesToggle('count', e.target.checked)}
            disabled={showCountSeries && !showValueSeries}
          />
        </div>
        <div className="d-flex d-md-none ms-auto">
          <CDropdown autoClose="outside">
            <CDropdownToggle
              className="p-1 border-0 bg-transparent text-body-secondary shadow-none"
              aria-label="Select CRM metrics"
            >
              <CIcon icon={cilOptions} size="lg" />
            </CDropdownToggle>
            <CDropdownMenu className="p-3">
              <div className="d-flex flex-column gap-2" onClick={(e) => e.stopPropagation()}>
                <CFormCheck
                  id="toggleQuoteValueSeriesMobile"
                  label="Value"
                  checked={showValueSeries}
                  onChange={(e) => handleSeriesToggle('value', e.target.checked)}
                  disabled={showValueSeries && !showCountSeries}
                />
                <CFormCheck
                  id="toggleQuoteCountSeriesMobile"
                  label="Quotes"
                  checked={showCountSeries}
                  onChange={(e) => handleSeriesToggle('count', e.target.checked)}
                  disabled={showCountSeries && !showValueSeries}
                />
              </div>
            </CDropdownMenu>
          </CDropdown>
        </div>
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading quotation value and count statistics..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : (
          <CRow className="gy-4 align-items-stretch">
            <CCol xs={12} lg={showDetailTable ? 8 : 12} className="d-flex flex-column">
              <div className="mb-2">
                <div className="text-muted small">Total for period ({periodRangeLabel})</div>
                {showValueSeries && (
                  <div className="h4 mb-1 text-primary">RM {periodTotal.toLocaleString()}</div>
                )}
                {showCountSeries && (
                  <div className="h6 mb-0 text-warning">
                    {periodCountTotal.toLocaleString()} quotes
                  </div>
                )}
              </div>
              <div className="position-relative w-100 flex-grow-1" style={{ minHeight: '260px' }}>
                <CChartLine
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                  data={{
                    labels,
                    datasets: chartDatasets,
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: labels.length > 1,
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
                      ...(showValueSeries
                        ? {
                            yValue: {
                              type: 'linear',
                              position: 'left',
                              grid: { display: false },
                              ticks: {
                                color: tickColor,
                                maxTicksLimit: 4,
                                callback: (value) => formatAxisTick(value),
                              },
                            },
                          }
                        : {}),
                      ...(showCountSeries
                        ? {
                            yCount: {
                              type: 'linear',
                              position: 'right',
                              grid: { display: false, drawOnChartArea: false },
                              ticks: {
                                color: tickColor,
                                maxTicksLimit: 4,
                                callback: (value) => formatAxisTick(value),
                              },
                            },
                          }
                        : {}),
                    },
                    elements: {
                      line: { borderWidth: 2, tension: 0.4 },
                      point: { radius: 3, hitRadius: 10, hoverRadius: 4 },
                    },
                    layout: {
                      padding: {
                        left: 0,
                        right: 40,
                        bottom: 10,
                      },
                    },
                  }}
                />
              </div>
            </CCol>

            {showDetailTable && (
              <CCol xs={12} lg={4}>
                <DataTableEmbeddedList
                  rows={monthlyQuotes}
                  columns={detailColumns}
                  footerRows={detailFooterRows}
                  getRowKey={(row) => row.month}
                  desktopBreakpoint="md"
                  shellStyle={shouldScrollTable ? { maxHeight: '40rem' } : undefined}
                  mobileClassName="dashboard-metric-mobile-list"
                  renderMobileItem={(row) => {
                    const amount = Number(row.amount) || 0
                    const count = Number(row.count) || 0

                    return (
                      <div className="data-table-mobile-item dashboard-metric-mobile-row">
                        <div className="dashboard-metric-mobile-main">
                          <div className="dashboard-metric-mobile-title">
                            {formatMonthLabel(row.month)}
                          </div>
                        </div>
                        <div className="dashboard-metric-mobile-values">
                          {showValueSeries && (
                            <div className="dashboard-metric-mobile-primary">
                              RM {amount.toLocaleString()}
                            </div>
                          )}
                          {showCountSeries && (
                            <div className="dashboard-metric-mobile-secondary">
                              Quotes {count.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }}
                  renderMobileFooterItem={() => (
                    <div className="data-table-mobile-item data-table-mobile-footer-item dashboard-metric-mobile-row dashboard-metric-mobile-total-row">
                      <div className="dashboard-metric-mobile-main">
                        <div className="dashboard-metric-mobile-title">Total</div>
                        <div className="dashboard-metric-mobile-subtitle">Selected period</div>
                      </div>
                      <div className="dashboard-metric-mobile-values">
                        {showValueSeries && (
                          <div className="dashboard-metric-mobile-primary">
                            RM {periodTotal.toLocaleString()}
                          </div>
                        )}
                        {showCountSeries && (
                          <div className="dashboard-metric-mobile-secondary">
                            Quotes {periodCountTotal.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                />
              </CCol>
            )}
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MonthlyQuoteValueWidget
