import React, { useState, useEffect } from 'react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import ConversionBreakdownCard from './ConversionBreakdownCard'

const ConversionRateByStaff = ({ startDate, endDate }) => {
  const [data, setData] = useState([])
  const [activeStaffCount, setActiveStaffCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadConversionRateByStaff = async () => {
      setLoading(true)
      setError('')

      try {
        const {
          status,
          conversionRateByStaff,
          activeStaffCount: activeCount,
        } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/conversion-rate-by-staff`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(conversionRateByStaff)) {
          setData(conversionRateByStaff)
          setActiveStaffCount(Number(activeCount) || 0)
        } else {
          setData([])
          setActiveStaffCount(0)
          setError('Unable to load conversion rate by staff.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData([])
        setActiveStaffCount(0)
        setError('Unable to load conversion rate by staff.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadConversionRateByStaff()

    return () => controller.abort()
  }, [startDate, endDate])

  return (
    <ConversionBreakdownCard
      dimensionLabel="Staff"
      labelHeader="Staff"
      rows={data.map((item) => ({
        label: item.staffCode || 'Unknown Staff',
        convertedCount: item.convertedCount,
        totalQuotes: item.totalQuotes,
        conversionRate: item.conversionRate,
      }))}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      averageDenominator={activeStaffCount}
      averageDenominatorLabel="active staff"
    />
  )
}

export default ConversionRateByStaff
