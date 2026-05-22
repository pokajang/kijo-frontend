import React, { useState, useEffect } from 'react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormCheck,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
} from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'
import { useChartTickColor } from '../../../utils/chartTheme'

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

const MonthlySalesWidget = ({ period, startDate, endDate }) => {
  const tickColor = useChartTickColor()
  const [monthlySales, setMonthlySales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showValueSeries, setShowValueSeries] = useState(true)
  const [showCountSeries, setShowCountSeries] = useState(true)

  // refetch whenever period changes
  useEffect(() => {
    const controller = new AbortController()

    const loadMonthlySales = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, monthlySales: data } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monthly-sales`,
          { period, start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(data)) {
          setMonthlySales(data)
        } else {
          setMonthlySales([])
          setError('Unable to load sales statistics.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setMonthlySales([])
        setError('Unable to load sales statistics.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonthlySales()

    return () => controller.abort()
  }, [period, startDate, endDate])

  // build labels & data
  const labels = monthlySales.map((ms) => formatMonthLabel(ms.month))
  const valuePoints = monthlySales.map((ms) => Number(ms.amount) || 0)
  const quotePoints = monthlySales.map((ms) => Number(ms.count) || 0)
  const terminatedPoints = monthlySales.map((ms) => Number(ms.terminatedAmount) || 0)
  const terminatedCountPoints = monthlySales.map((ms) => Number(ms.terminatedCount) || 0)
  const periodTotal = valuePoints.reduce((sum, value) => sum + value, 0)
  const periodQuoteTotal = quotePoints.reduce((sum, value) => sum + value, 0)
  const terminatedTotal = terminatedPoints.reduce((sum, value) => sum + value, 0)
  const terminatedCountTotal = terminatedCountPoints.reduce((sum, value) => sum + value, 0)
  const showDetailTable = monthlySales.length > 1 && (showValueSeries || showCountSeries)
  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)

  const shouldScrollTable = monthlySales.length > 12
  const detailColumns = [
    {
      key: 'month',
      label: 'Month',
      render: (row) => (
        <>
          {formatMonthLabel(row.month)}
          {Number(row.terminatedAmount || 0) > 0 && (
            <div className="small text-muted">
              Excl. terminated RM {Number(row.terminatedAmount || 0).toLocaleString()}
            </div>
          )}
        </>
      ),
    },
    ...(showValueSeries
      ? [
          {
            key: 'amount',
            label: 'Value (RM)',
            align: 'end',
            render: (row) => (Number(row.amount) || 0).toLocaleString(),
          },
        ]
      : []),
    ...(showCountSeries
      ? [
          {
            key: 'count',
            label: 'Realized Jobs',
            align: 'end',
            render: (row) => (Number(row.count) || 0).toLocaleString(),
          },
        ]
      : []),
  ]
  const detailFooterRows = [
    {
      key: 'total',
      className: 'fw-semibold text-muted',
      cells: [
        {
          key: 'total-label',
          content: 'Total',
          mobileLabel: 'Summary',
          className: 'text-muted',
        },
        ...(showValueSeries
          ? [
              {
                key: 'total-value',
                content: periodTotal.toLocaleString(),
                mobileLabel: 'Value (RM)',
                align: 'end',
                className: 'text-muted',
              },
            ]
          : []),
        ...(showCountSeries
          ? [
              {
                key: 'total-count',
                content: periodQuoteTotal.toLocaleString(),
                mobileLabel: 'Realized Jobs',
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
            label: 'Sales Value (RM)',
            backgroundColor: 'transparent',
            borderColor: '#2eb85c',
            pointBackgroundColor: '#2eb85c',
            data: valuePoints,
            yAxisID: 'yValue',
          },
        ]
      : []),
    ...(showCountSeries
      ? [
          {
            label: 'Realized Jobs',
            backgroundColor: 'transparent',
            borderColor: '#f9b115',
            pointBackgroundColor: '#f9b115',
            data: quotePoints,
            yAxisID: 'yCount',
          },
        ]
      : []),
  ]

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>Monthly Sales &amp; Realized Jobs</strong>
        </div>
        <div className="d-none d-md-flex align-items-center gap-3">
          <CFormCheck
            id="toggleSalesValueSeries"
            label="Value"
            checked={showValueSeries}
            onChange={(e) => handleSeriesToggle('value', e.target.checked)}
            disabled={showValueSeries && !showCountSeries}
          />
          <CFormCheck
            id="toggleSalesCountSeries"
            label="Realized Jobs"
            checked={showCountSeries}
            onChange={(e) => handleSeriesToggle('count', e.target.checked)}
            disabled={showCountSeries && !showValueSeries}
          />
        </div>
        <div className="d-flex d-md-none ms-auto">
          <CDropdown autoClose="outside">
            <CDropdownToggle
              className="p-1 border-0 bg-transparent text-body-secondary shadow-none"
              aria-label="Select sales metrics"
            >
              <CIcon icon={cilOptions} size="lg" />
            </CDropdownToggle>
            <CDropdownMenu className="p-3">
              <div className="d-flex flex-column gap-2" onClick={(e) => e.stopPropagation()}>
                <CFormCheck
                  id="toggleSalesValueSeriesMobile"
                  label="Value"
                  checked={showValueSeries}
                  onChange={(e) => handleSeriesToggle('value', e.target.checked)}
                  disabled={showValueSeries && !showCountSeries}
                />
                <CFormCheck
                  id="toggleSalesCountSeriesMobile"
                  label="Realized Jobs"
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
          <DataTableLoadingState message="Loading sales statistics..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : (
          <CRow className="gy-4 align-items-stretch">
            <CCol xs={12} lg={showDetailTable ? 8 : 12} className="d-flex flex-column">
              <div className="mb-2">
                <div className="text-muted small">Total for period ({periodRangeLabel})</div>
                <div className="d-flex flex-wrap align-items-baseline gap-3">
                  {showValueSeries && (
                    <div className="h4 mb-1 text-success">RM {periodTotal.toLocaleString()}</div>
                  )}
                  {showCountSeries && (
                    <div className="h4 mb-1 text-warning">
                      Realized Jobs: {periodQuoteTotal.toLocaleString()}
                    </div>
                  )}
                </div>
                {terminatedTotal > 0 && (
                  <div className="small text-muted">
                    Excludes terminated: RM {terminatedTotal.toLocaleString()} across{' '}
                    {terminatedCountTotal.toLocaleString()} jobs
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
                  }}
                />
              </div>
            </CCol>

            {showDetailTable && (
              <CCol xs={12} lg={4}>
                <DataTableEmbeddedList
                  rows={monthlySales}
                  columns={detailColumns}
                  footerRows={detailFooterRows}
                  getRowKey={(row) => row.month}
                  desktopBreakpoint="md"
                  shellStyle={shouldScrollTable ? { maxHeight: '40rem' } : undefined}
                  mobileClassName="dashboard-metric-mobile-list"
                  renderMobileItem={(row) => {
                    const amount = Number(row.amount) || 0
                    const count = Number(row.count) || 0
                    const terminatedAmount = Number(row.terminatedAmount || 0)

                    return (
                      <div className="data-table-mobile-item dashboard-metric-mobile-row">
                        <div className="dashboard-metric-mobile-main">
                          <div className="dashboard-metric-mobile-title">
                            {formatMonthLabel(row.month)}
                          </div>
                          {terminatedAmount > 0 && (
                            <div className="dashboard-metric-mobile-subtitle">
                              Excl. terminated RM {terminatedAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="dashboard-metric-mobile-values">
                          {showValueSeries && (
                            <div className="dashboard-metric-mobile-primary">
                              RM {amount.toLocaleString()}
                            </div>
                          )}
                          {showCountSeries && (
                            <div className="dashboard-metric-mobile-secondary">
                              Realized Jobs {count.toLocaleString()}
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
                            Realized Jobs {periodQuoteTotal.toLocaleString()}
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

export default MonthlySalesWidget
