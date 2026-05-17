import React, { useState, useEffect } from 'react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import AwardedValueBreakdownCard from './AwardedValueBreakdownCard'

const AwardedValueBySource = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch awarded-value-by-source whenever dates change
  useEffect(() => {
    const controller = new AbortController()

    const loadAwardedValueBySource = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, awardValueBySource } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/awarded-value-by-source`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(awardValueBySource)) {
          setData(awardValueBySource)
        } else {
          setData([])
          setError('Unable to load awarded value by source.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load awarded value by source.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAwardedValueBySource()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <AwardedValueBreakdownCard
      dimensionLabel="Source"
      labelHeader="Source"
      rows={data.map((item) => ({
        label: item.sourceName || item.source,
        value: Number(item.awardedValue) || 0,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
    />
  )
}

export default AwardedValueBySource
