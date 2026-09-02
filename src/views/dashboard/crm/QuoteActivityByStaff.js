import React, { useState, useEffect } from 'react'
import { CButton, CButtonGroup } from '@coreui/react'
import { formatCount, formatMoney } from '../../../utils/formatters/numberFormatters'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import RankedMetricBreakdownCard from './RankedMetricBreakdownCard'

const QuoteActivityByStaff = ({ startDate, endDate }) => {
  const [activeMetric, setActiveMetric] = useState('count')
  const [quoteCounts, setQuoteCounts] = useState([])
  const [quoteValues, setQuoteValues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadQuoteActivityByStaff = async () => {
      setLoading(true)
      setError('')

      try {
        const [countRes, valueRes] = await Promise.all([
          fetchJsonGet(
            `${import.meta.env.VITE_API_BASE}stats/quote-count-by-person`,
            { start_date: startDate, end_date: endDate },
            controller.signal,
          ),
          fetchJsonGet(
            `${import.meta.env.VITE_API_BASE}stats/quote-value-by-person`,
            { start_date: startDate, end_date: endDate },
            controller.signal,
          ),
        ])

        if (controller.signal.aborted) return

        const countRows =
          countRes?.status === 'success' && Array.isArray(countRes.quoteCountByPerson)
            ? countRes.quoteCountByPerson
            : null
        const valueRows =
          valueRes?.status === 'success' && Array.isArray(valueRes.quoteValueByPerson)
            ? valueRes.quoteValueByPerson
            : null

        if (countRows && valueRows) {
          setQuoteCounts(countRows)
          setQuoteValues(valueRows)
        } else {
          setQuoteCounts([])
          setQuoteValues([])
          setError('Unable to load quotation activity by staff.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setQuoteCounts([])
        setQuoteValues([])
        setError('Unable to load quotation activity by staff.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadQuoteActivityByStaff()

    return () => controller.abort()
  }, [startDate, endDate])

  const isValueMetric = activeMetric === 'value'
  const rows = isValueMetric
    ? quoteValues.map((item) => ({
        label: item.staffCode || 'Unknown Staff',
        value: Number(item.totalValue) || 0,
      }))
    : quoteCounts.map((item) => ({
        label: item.staffCode || 'Unknown Staff',
        value: Number(item.quoteCount) || 0,
      }))

  return (
    <RankedMetricBreakdownCard
      metricTitle="Staff Contribution"
      dimensionLabel="Staff"
      labelHeader="Staff"
      totalLabel={isValueMetric ? 'Total quotation value' : 'Total quotes'}
      valueColumnLabel={isValueMetric ? 'Value (RM)' : 'Quotes'}
      rows={rows}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      formatValue={isValueMetric ? formatMoney : formatCount}
      barColorClass="bg-primary"
      headerActions={
        <CButtonGroup size="sm" role="group" aria-label="Select staff quotation metric">
          <CButton
            size="sm"
            color="primary"
            variant={isValueMetric ? undefined : 'outline'}
            className="px-2 py-1"
            onClick={() => setActiveMetric('value')}
          >
            Value
          </CButton>
          <CButton
            size="sm"
            color="primary"
            variant={!isValueMetric ? undefined : 'outline'}
            className="px-2 py-1"
            onClick={() => setActiveMetric('count')}
          >
            Quotes
          </CButton>
        </CButtonGroup>
      }
    />
  )
}

export default QuoteActivityByStaff
