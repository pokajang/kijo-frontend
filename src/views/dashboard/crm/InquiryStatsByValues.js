import React, { useState, useEffect } from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CWidgetStatsB } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'

const InquiryStatsByValues = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch data whenever date range changes
  useEffect(() => {
    const controller = new AbortController()

    const loadInquiryStatsByValues = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, inquiryStatsByValues } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/inquiry-by-values`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(inquiryStatsByValues)) {
          setData(inquiryStatsByValues)
        } else {
          setData([])
          setError('Unable to load quotation value by inquiry source.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load quotation value by inquiry source.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadInquiryStatsByValues()

    return () => controller.abort()
  }, [startDate, endDate])

  // total of all values, for percentage
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CRow className="align-items-center">
          <CCol className="text-nowrap">
            <strong>Quotation Value</strong> <small className="text-muted">By Inquiry Source</small>
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
                  key={`${item.source || 'source'}-${item.totalValue || 0}`}
                >
                  <CWidgetStatsB
                    className="mb-3"
                    progress={{ color: 'primary', value: pct }}
                    title={
                      <>
                        <strong>{item.source}</strong> <small>({pct}%)</small>
                      </>
                    }
                    value={`RM ${item.totalValue.toLocaleString()}`}
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

export default InquiryStatsByValues
