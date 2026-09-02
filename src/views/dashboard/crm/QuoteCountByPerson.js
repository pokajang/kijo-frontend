import React, { useState, useEffect } from 'react'
import { formatCount } from '../../../utils/formatters/numberFormatters'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import RankedMetricBreakdownCard from './RankedMetricBreakdownCard'

const QuoteCountByPerson = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadQuoteCountByPerson = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, quoteCountByPerson } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/quote-count-by-person`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        const rows =
          status === 'success' && Array.isArray(quoteCountByPerson) ? quoteCountByPerson : []

        if (status !== 'success') {
          setError('Unable to load quotation count by staff.')
        }

        // sort desc by count for nicer display
        rows.sort((a, b) => (b.quoteCount || 0) - (a.quoteCount || 0))
        setData(rows)
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load quotation count by staff.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadQuoteCountByPerson()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <RankedMetricBreakdownCard
      metricTitle="Quotation Number"
      dimensionLabel="Staff"
      labelHeader="Staff"
      totalLabel="Total quotes"
      valueColumnLabel="Quotes"
      rows={data.map((item) => ({
        label: item.staffCode || 'Unknown Staff',
        value: Number(item.quoteCount) || 0,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      formatValue={formatCount}
      barColorClass="bg-primary"
    />
  )
}

export default QuoteCountByPerson
