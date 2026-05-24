import React, { useState, useEffect } from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'
import { useChartPalette, useChartTickColor } from '../../../utils/chartTheme'

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

const QuoteValueByServiceMonthly = ({ startDate, endDate }) => {
  const tickColor = useChartTickColor()
  const chartPalette = useChartPalette()
  const [months, setMonths] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch monthly stats when date range changes
  useEffect(() => {
    const controller = new AbortController()

    const loadMonthlyQuoteValueByService = async () => {
      setLoading(true)
      setError('')

      try {
        const {
          status,
          months: monthKeys,
          monthlyStats,
        } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monthly-quote-value-by-service`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(monthlyStats) && Array.isArray(monthKeys)) {
          setMonths(monthKeys)
          setStats(monthlyStats)
        } else {
          setMonths([])
          setStats([])
          setError('Unable to load quotation value by service-month.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setMonths([])
        setStats([])
        setError('Unable to load quotation value by service-month.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonthlyQuoteValueByService()

    return () => {
      controller.abort()
    }
  }, [startDate, endDate])

  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)
  const sortedStats = [...stats].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
  const totalValue = sortedStats.reduce((sum, item) => sum + Number(item.totalValue || 0), 0)
  const monthRows = months.map((month, index) => {
    let monthTotal = 0

    sortedStats.forEach((item) => {
      const value = Number(item.monthlyValues?.[index] || 0)
      monthTotal += value
    })

    return {
      month,
      totalValue: monthTotal,
    }
  })
  const monthColumns = [
    { key: 'month', label: 'Month', render: (row) => formatMonthLabel(row.month) },
    {
      key: 'totalValue',
      label: 'Total (RM)',
      align: 'end',
      render: (row) => row.totalValue.toLocaleString(),
    },
  ]
  const monthFooterRows = [
    {
      key: 'total',
      className: 'fw-semibold text-muted',
      cells: [
        { key: 'label', content: 'Total', className: 'text-muted' },
        {
          key: 'value',
          content: totalValue.toLocaleString(),
          align: 'end',
          className: 'text-muted',
        },
      ],
    },
  ]

  const chartDatasets = sortedStats.map((item, index) => ({
    label: item.serviceGroup,
    backgroundColor: chartPalette[index % chartPalette.length],
    borderColor: 'transparent',
    borderWidth: 0,
    data: months.map((_, monthIndex) => Number(item.monthlyValues?.[monthIndex] || 0)),
    stack: 'quoteValue',
    maxBarThickness: 48,
  }))

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CRow className="align-items-center gy-2">
          <CCol>
            <strong>Service Mix Over Time</strong>{' '}
            <small className="text-muted">Quote value by month</small>
          </CCol>
        </CRow>
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading data..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : stats.length === 0 ? (
          <div className="text-center text-muted py-4">
            No data available for the selected period.
          </div>
        ) : (
          <>
            <div className="mb-3">
              <CRow>
                <CCol xs={12}>
                  <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2">
                    <div className="text-muted text-start">
                      Total quotation value for period ({periodRangeLabel})
                    </div>
                    <div className="h2 mb-0 text-primary text-end ms-auto">
                      RM {totalValue.toLocaleString()}
                    </div>
                  </div>
                </CCol>
              </CRow>
            </div>

            <CRow className="gy-4 align-items-stretch">
              <CCol xs={12} lg={months.length > 1 ? 8 : 12} className="d-flex flex-column">
                <div className="position-relative w-100 flex-grow-1" style={{ minHeight: '320px' }}>
                  <CChartBar
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    data={{
                      labels: months.map((month) => formatMonthLabel(month)),
                      datasets: chartDatasets,
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: chartDatasets.length > 1,
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

              {months.length > 1 && (
                <CCol xs={12} lg={4}>
                  <DataTableEmbeddedList
                    rows={monthRows}
                    columns={monthColumns}
                    footerRows={monthFooterRows}
                    getRowKey={(row) => row.month}
                    desktopBreakpoint="md"
                    mobileClassName="dashboard-metric-mobile-list"
                    renderMobileItem={(row) => (
                      <div className="data-table-mobile-item dashboard-metric-mobile-row">
                        <div className="dashboard-metric-mobile-main">
                          <div className="dashboard-metric-mobile-title">
                            {formatMonthLabel(row.month)}
                          </div>
                        </div>
                        <div className="dashboard-metric-mobile-values">
                          <div className="dashboard-metric-mobile-primary">
                            RM {row.totalValue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    renderMobileFooterItem={() => (
                      <div className="data-table-mobile-item data-table-mobile-footer-item dashboard-metric-mobile-row dashboard-metric-mobile-total-row">
                        <div className="dashboard-metric-mobile-main">
                          <div className="dashboard-metric-mobile-title">Total</div>
                          <div className="dashboard-metric-mobile-subtitle">Selected period</div>
                        </div>
                        <div className="dashboard-metric-mobile-values">
                          <div className="dashboard-metric-mobile-primary">
                            RM {totalValue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </CCol>
              )}
            </CRow>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default QuoteValueByServiceMonthly
