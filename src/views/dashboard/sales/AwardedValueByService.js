import React, { useState, useEffect } from 'react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import AwardedValueBreakdownCard from './AwardedValueBreakdownCard'

const AwardedValueByService = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch awarded-value data when dates change
  useEffect(() => {
    const controller = new AbortController()

    const loadAwardedValueByService = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, awardValueByService } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/awarded-value-by-service`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(awardValueByService)) {
          setData(awardValueByService)
        } else {
          setData([])
          setError('Unable to load awarded value by service.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load awarded value by service.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAwardedValueByService()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <AwardedValueBreakdownCard
      dimensionLabel="Service Group"
      labelHeader="Service Group"
      rows={data.map((item) => ({
        key: item.serviceKey || item.serviceGroup || 'unknown-service-group',
        label: item.serviceGroup || 'Unknown Service Group',
        value: Number(item.awardedValue) || 0,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
    />
  )
}

export default AwardedValueByService
