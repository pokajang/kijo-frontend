import { useCallback, useEffect, useState } from 'react'
import { fetchMonthlyFeedbackSla } from './actionHandlers'

const useFeedbackSlaMetrics = ({ year = new Date().getFullYear(), enabled = true } = {}) => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState('')
  const [targetPercent, setTargetPercent] = useState(90)

  const loadMetrics = useCallback(
    async (signal = undefined) => {
      if (!enabled) return

      setLoading(true)
      setError('')
      try {
        const result = await fetchMonthlyFeedbackSla(year, signal)
        if (signal?.aborted) return

        if (result.status === 'success' && Array.isArray(result.months)) {
          setRows(result.months)
          setTargetPercent(Number(result.target_percent ?? 90))
        } else {
          setRows([])
          setError(result.message || 'Unable to load feedback SLA.')
        }
      } catch (err) {
        if (signal?.aborted) return
        setRows([])
        setError('Unable to load feedback SLA.')
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [enabled, year],
  )

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    loadMetrics(controller.signal)
    return () => controller.abort()
  }, [enabled, loadMetrics])

  return {
    rows,
    loading,
    error,
    targetPercent,
    year,
    refresh: loadMetrics,
  }
}

export default useFeedbackSlaMetrics
