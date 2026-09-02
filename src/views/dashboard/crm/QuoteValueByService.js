import React, { useState, useEffect } from 'react'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import RankedMetricBreakdownCard from './RankedMetricBreakdownCard'

const QuoteValueByService = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch data whenever date range changes
  useEffect(() => {
    const controller = new AbortController()

    const loadQuoteValueByService = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, quoteValueByService } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/quote-value-by-service`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(quoteValueByService)) {
          setData(quoteValueByService)
        } else {
          setData([])
          setError('Unable to load quotation value by service.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load quotation value by service.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadQuoteValueByService()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <RankedMetricBreakdownCard
      metricTitle="Quotation Value"
      dimensionLabel="Service Group"
      labelHeader="Service Group"
      totalLabel="Total quotation value"
      valueColumnLabel="Value (RM)"
      rows={data.map((item) => ({
        key: item.serviceKey || item.serviceGroup || 'unknown-service-group',
        label: item.serviceGroup || 'Unknown Service Group',
        value: Number(item.totalValue) || 0,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      formatValue={formatMoney}
      barColorClass="bg-primary"
    />
  )
}

export default QuoteValueByService
