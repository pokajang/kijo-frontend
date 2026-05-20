import React, { useState, useEffect } from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { useChartTickColor } from '../../../utils/chartTheme'

const formatMonthLabel = (ym) => {
  const [y, m] = ym.split('-')
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

const MonthlyQuoteCountWidget = ({ period, startDate, endDate }) => {
  const tickColor = useChartTickColor()
  const [monthlyQuoteCount, setMonthlyQuoteCount] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadMonthlyQuoteCount = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, monthlyQuoteCount: data } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monthly-quote-count`,
          { period, start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(data)) {
          setMonthlyQuoteCount(data)
        } else {
          setMonthlyQuoteCount([])
          setError('Unable to load quotation count statistics.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setMonthlyQuoteCount([])
        setError('Unable to load quotation count statistics.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonthlyQuoteCount()

    return () => controller.abort()
  }, [period, startDate, endDate])

  const labels = monthlyQuoteCount.map((mq) => formatMonthLabel(mq.month))
  const dataPoints = monthlyQuoteCount.map((mq) => Number(mq.count) || 0)
  const periodTotal = dataPoints.reduce((sum, value) => sum + value, 0)
  const detailRows = monthlyQuoteCount.map((row, index) => ({
    ...row,
    label: labels[index],
    countValue: dataPoints[index],
  }))
  const detailColumns = [
    { key: 'month', label: 'Month', render: (row) => row.label },
    {
      key: 'count',
      label: 'Count',
      align: 'end',
      render: (row) => row.countValue?.toLocaleString(),
    },
  ]
  const footerRows = [
    {
      key: 'total',
      className: 'fw-semibold text-muted',
      cells: [
        { key: 'label', content: 'Total', className: 'text-muted' },
        {
          key: 'count',
          content: periodTotal.toLocaleString(),
          align: 'end',
          className: 'text-muted',
        },
      ],
    },
  ]

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <strong>CRM Statistics</strong>{' '}
          <span className="text-muted small">Monthly Quote Count</span>
        </div>
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading quotation count statistics..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : (
          <CRow className="gy-4 align-items-stretch">
            <CCol xs={12} lg={8} className="d-flex flex-column">
              <div className="mb-2">
                <div className="text-muted small">Total for period</div>
                <div className="h4 mb-1 text-warning">{periodTotal.toLocaleString()} quotes</div>
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
                    datasets: [
                      {
                        label: 'Quote Count',
                        backgroundColor: 'transparent',
                        borderColor: '#f9b115',
                        pointBackgroundColor: '#f9b115',
                        data: dataPoints,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: tickColor },
                      },
                      y: {
                        grid: { display: false },
                        ticks: { display: false },
                      },
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

            <CCol xs={12} lg={4}>
              {labels.length > 0 && dataPoints.length > 0 ? (
                <DataTableEmbeddedList
                  rows={detailRows}
                  columns={detailColumns}
                  footerRows={footerRows}
                  getRowKey={(row) => row.month}
                  desktopBreakpoint="md"
                />
              ) : (
                <div className="text-muted small">No data available</div>
              )}
            </CCol>
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MonthlyQuoteCountWidget
