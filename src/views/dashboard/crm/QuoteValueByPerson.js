import React, { useState, useEffect } from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CWidgetStatsB } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { formatMoney } from '../../../utils/formatters/numberFormatters'

import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'

const QuoteValueByPerson = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch data on date changes
  useEffect(() => {
    const controller = new AbortController()

    const loadQuoteValueByPerson = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, quoteValueByPerson } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/quote-value-by-person`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(quoteValueByPerson)) {
          setData(quoteValueByPerson)
        } else {
          setData([])
          setError('Unable to load quotation value by staff.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load quotation value by staff.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadQuoteValueByPerson()

    return () => controller.abort()
  }, [startDate, endDate])

  // total across all staff, for percent bars
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CRow className="align-items-center">
          <CCol className="text-nowrap">
            <strong>Quotation Value</strong> <small className="text-muted">By Staff</small>
          </CCol>
        </CRow>
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading data..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : data.length === 0 ? (
          <div className="text-center text-muted py-4">No data available</div>
        ) : (
          <CRow>
            {data.map((item) => {
              const pct = totalValue ? Math.round((item.totalValue / totalValue) * 100) : 0
              return (
                <CCol
                  xs={6}
                  md={4}
                  lg={3}
                  key={`${item.staffCode || 'staff'}-${item.totalValue || 0}`}
                >
                  <CWidgetStatsB
                    className="mb-3"
                    progress={{ color: 'primary', value: pct }}
                    title={
                      <>
                        <strong>{item.staffCode}</strong>{' '}
                        <small className="text-muted">({pct}%)</small>
                      </>
                    }
                    value={formatMoney(item.totalValue)}
                  />
                </CCol>
              )
            })}
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default QuoteValueByPerson
