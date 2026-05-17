import React, { useState, useEffect } from 'react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import ConversionBreakdownCard from './ConversionBreakdownCard'

const ConversionRateBySource = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch conversion rate by source whenever dates change
  useEffect(() => {
    const controller = new AbortController()

    const loadConversionRateBySource = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, conversionRateBySource } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/conversion-rate-by-source`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(conversionRateBySource)) {
          setData(conversionRateBySource)
        } else {
          setData([])
          setError('Unable to load conversion rate by source.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load conversion rate by source.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadConversionRateBySource()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <ConversionBreakdownCard
      dimensionLabel="Inquiry Source"
      labelHeader="Inquiry Source"
      rows={data.map((item) => ({
        label: item.sourceName || 'Unattributed',
        convertedCount: item.convertedCount,
        totalQuotes: item.totalQuotes,
        conversionRate: item.conversionRate,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
    />
  )
}

export default ConversionRateBySource
