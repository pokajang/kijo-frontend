import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableBody,
  CTableFoot,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'
import { useChartTickColor } from '../../../utils/chartTheme'

const CHART_COLORS = ['#4f5dff', '#2eb85c', '#f9b115', '#e55353', '#3399ff', '#9c27b0']

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

  const chartDatasets = sortedStats.map((item, index) => ({
    label: item.serviceGroup,
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
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
                  <div className="rounded-4 overflow-hidden bg-light">
                    {/* datatable-exempt: existing embedded/layout table */}
                    <CTable
                      responsive
                      align="middle"
                      className="mb-0 table-borderless border-0 data-table-compact embedded-data-table"
                    >
                      <CTableHead>
                        <CTableRow className="table-light">
                          <CTableHeaderCell
                            style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                          >
                            Month
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-end"
                            style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                          >
                            Total (RM)
                          </CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {monthRows.map((row) => (
                          <CTableRow key={row.month} className="table-light">
                            <CTableDataCell className="border-0">
                              {formatMonthLabel(row.month)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end border-0">
                              {row.totalValue.toLocaleString()}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                      <CTableFoot>
                        <CTableRow className="table-light fw-semibold text-muted">
                          <CTableDataCell
                            className="text-muted"
                            style={{ borderTop: '1px solid var(--app-surface-page)' }}
                          >
                            Total
                          </CTableDataCell>
                          <CTableDataCell
                            className="text-end text-muted"
                            style={{ borderTop: '1px solid var(--app-surface-page)' }}
                          >
                            {totalValue.toLocaleString()}
                          </CTableDataCell>
                        </CTableRow>
                      </CTableFoot>
                    </CTable>
                  </div>
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
