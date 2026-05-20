import React, { useEffect, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CFormCheck,
  CRow,
} from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { useChartTickColor } from '../../../utils/chartTheme'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'

const formatMonthLabel = (ym) => {
  const [year, month] = String(ym || '').split('-')
  const date = new Date(Number(year), Number(month) - 1)
  if (Number.isNaN(date.getTime())) return ym || '-'

  return date.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

const formatAxisTick = (value) => {
  const numeric = Number(value) || 0
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1)}K`
  return numeric.toLocaleString()
}

const formatAmount = (value) => Number(value || 0).toLocaleString()

const MonthlyFinancialTrendWidget = ({ startDate, endDate }) => {
  const tickColor = useChartTickColor()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvoicedSeries, setShowInvoicedSeries] = useState(true)
  const [showReceivedSeries, setShowReceivedSeries] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadTrend = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, monthlyInvoicedReceivedTrend } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monthly-invoiced-received-trend`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(monthlyInvoicedReceivedTrend)) {
          setRows(monthlyInvoicedReceivedTrend)
        } else {
          setRows([])
          setError('Unable to load financial trend.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setRows([])
        setError('Unable to load financial trend.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadTrend()

    return () => controller.abort()
  }, [startDate, endDate])

  const labels = rows.map((row) => formatMonthLabel(row.month))
  const invoicedPoints = rows.map((row) => Number(row.invoiced) || 0)
  const receivedPoints = rows.map((row) => Number(row.received) || 0)
  const periodInvoiced = invoicedPoints.reduce((sum, value) => sum + value, 0)
  const periodReceived = receivedPoints.reduce((sum, value) => sum + value, 0)
  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)
  const showDetailTable = rows.length > 1 && (showInvoicedSeries || showReceivedSeries)
  const shouldScrollTable = rows.length > 12

  const handleSeriesToggle = (series, checked) => {
    if (!checked) {
      const activeCount = Number(showInvoicedSeries) + Number(showReceivedSeries)
      if (activeCount === 1) return
    }

    if (series === 'invoiced') setShowInvoicedSeries(checked)
    if (series === 'received') setShowReceivedSeries(checked)
  }

  const detailColumns = [
    { key: 'month', label: 'Month', render: (row) => formatMonthLabel(row.month) },
    ...(showInvoicedSeries
      ? [
          {
            key: 'invoiced',
            label: 'Invoiced',
            align: 'end',
            render: (row) => formatAmount(row.invoiced),
          },
        ]
      : []),
    ...(showReceivedSeries
      ? [
          {
            key: 'received',
            label: 'Received',
            align: 'end',
            render: (row) => formatAmount(row.received),
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
        ...(showInvoicedSeries
          ? [
              {
                key: 'invoiced',
                content: formatAmount(periodInvoiced),
                align: 'end',
                className: 'text-muted',
              },
            ]
          : []),
        ...(showReceivedSeries
          ? [
              {
                key: 'received',
                content: formatAmount(periodReceived),
                align: 'end',
                className: 'text-muted',
              },
            ]
          : []),
      ],
    },
  ]

  const chartDatasets = [
    ...(showInvoicedSeries
      ? [
          {
            label: 'Invoiced (RM)',
            backgroundColor: 'transparent',
            borderColor: '#4f5dff',
            pointBackgroundColor: '#4f5dff',
            data: invoicedPoints,
            yAxisID: 'yValue',
          },
        ]
      : []),
    ...(showReceivedSeries
      ? [
          {
            label: 'Received (RM)',
            backgroundColor: 'transparent',
            borderColor: '#2eb85c',
            pointBackgroundColor: '#2eb85c',
            data: receivedPoints,
            yAxisID: 'yValue',
          },
        ]
      : []),
  ]

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>Monthly Invoiced vs Received</strong>
        </div>
        <div className="d-none d-md-flex align-items-center gap-3">
          <CFormCheck
            id="toggleFinancialInvoicedSeries"
            label="Invoiced"
            checked={showInvoicedSeries}
            onChange={(event) => handleSeriesToggle('invoiced', event.target.checked)}
            disabled={showInvoicedSeries && !showReceivedSeries}
          />
          <CFormCheck
            id="toggleFinancialReceivedSeries"
            label="Received"
            checked={showReceivedSeries}
            onChange={(event) => handleSeriesToggle('received', event.target.checked)}
            disabled={showReceivedSeries && !showInvoicedSeries}
          />
        </div>
        <div className="d-flex d-md-none ms-auto">
          <CDropdown autoClose="outside">
            <CDropdownToggle
              className="p-1 border-0 bg-transparent text-body-secondary shadow-none"
              aria-label="Select financial metrics"
            >
              <CIcon icon={cilOptions} size="lg" />
            </CDropdownToggle>
            <CDropdownMenu className="p-3">
              <div
                className="d-flex flex-column gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                <CFormCheck
                  id="toggleFinancialInvoicedSeriesMobile"
                  label="Invoiced"
                  checked={showInvoicedSeries}
                  onChange={(event) => handleSeriesToggle('invoiced', event.target.checked)}
                  disabled={showInvoicedSeries && !showReceivedSeries}
                />
                <CFormCheck
                  id="toggleFinancialReceivedSeriesMobile"
                  label="Received"
                  checked={showReceivedSeries}
                  onChange={(event) => handleSeriesToggle('received', event.target.checked)}
                  disabled={showReceivedSeries && !showInvoicedSeries}
                />
              </div>
            </CDropdownMenu>
          </CDropdown>
        </div>
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading financial trend..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : (
          <CRow className="gy-4 align-items-stretch">
            <CCol xs={12} lg={showDetailTable ? 8 : 12} className="d-flex flex-column">
              <div className="mb-2">
                <div className="text-muted small">Total for period ({periodRangeLabel})</div>
                <div className="d-flex flex-wrap align-items-baseline gap-3">
                  {showInvoicedSeries && (
                    <div className="h4 mb-1 text-primary">RM {formatAmount(periodInvoiced)}</div>
                  )}
                  {showReceivedSeries && (
                    <div className="h4 mb-1 text-success">RM {formatAmount(periodReceived)}</div>
                  )}
                </div>
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
                  rows={rows}
                  columns={detailColumns}
                  footerRows={detailFooterRows}
                  getRowKey={(row) => row.month}
                  desktopBreakpoint="md"
                  shellStyle={shouldScrollTable ? { maxHeight: '40rem' } : undefined}
                />
              </CCol>
            )}
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MonthlyFinancialTrendWidget
