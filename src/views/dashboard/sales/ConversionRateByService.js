import React, { useState, useEffect } from 'react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import ConversionBreakdownCard from './ConversionBreakdownCard'

const ConversionRateByService = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch conversion-rate-by-service whenever dates change
  useEffect(() => {
    const controller = new AbortController()

    const loadConversionRateByService = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, conversionRateByService } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/conversion-rate-by-service`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(conversionRateByService)) {
          setData(conversionRateByService)
        } else {
          setData([])
          setError('Unable to load conversion rate by service.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load conversion rate by service.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadConversionRateByService()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <ConversionBreakdownCard
      dimensionLabel="Service Group"
      labelHeader="Service Group"
      rows={data.map((item) => ({
        label: item.serviceGroup || 'Unknown Service Group',
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

export default ConversionRateByService
