import React, { useState, useEffect } from 'react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import AwardedValueBreakdownCard from './AwardedValueBreakdownCard'

const INDIVIDUAL_SALES_TARGET = 860000

const AwardedValueByPerson = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch awarded-value-by-person whenever dates change
  useEffect(() => {
    const controller = new AbortController()

    const loadAwardedValueByPerson = async () => {
      setLoading(true)
      setError('')

      try {
        const { status, awardValueByPerson } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/awarded-value-by-person`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(awardValueByPerson)) {
          setData(awardValueByPerson)
        } else {
          setData([])
          setError('Unable to load awarded value by staff.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setError('Unable to load awarded value by staff.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAwardedValueByPerson()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <AwardedValueBreakdownCard
      dimensionLabel="Staff"
      labelHeader="Staff"
      rows={data.map((item) => ({
        label: item.staffCode,
        value: Number(item.totalAwarded) || 0,
        roiTarget: INDIVIDUAL_SALES_TARGET,
        roi:
          INDIVIDUAL_SALES_TARGET > 0
            ? ((Number(item.totalAwarded) || 0) / INDIVIDUAL_SALES_TARGET) * 100
            : null,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
    />
  )
}

export default AwardedValueByPerson
