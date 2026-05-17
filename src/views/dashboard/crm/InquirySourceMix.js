import React, { useState, useEffect } from 'react'
import { CButton, CButtonGroup } from '@coreui/react'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import RankedMetricBreakdownCard from './RankedMetricBreakdownCard'

const InquirySourceMix = ({ startDate, endDate }) => {
  const [activeMetric, setActiveMetric] = useState('count')
  const [countRows, setCountRows] = useState([])
  const [valueRows, setValueRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadInquirySourceMix = async () => {
      setLoading(true)
      setError('')

      try {
        const [countRes, valueRes] = await Promise.all([
          fetchJsonGet(
            `${import.meta.env.VITE_API_BASE}stats/inquiry`,
            { start_date: startDate, end_date: endDate },
            controller.signal,
          ),
          fetchJsonGet(
            `${import.meta.env.VITE_API_BASE}stats/inquiry-by-values`,
            { start_date: startDate, end_date: endDate },
            controller.signal,
          ),
        ])

        if (controller.signal.aborted) return

        const countData =
          countRes?.status === 'success' && Array.isArray(countRes.inquiryStats)
            ? countRes.inquiryStats
            : null
        const valueData =
          valueRes?.status === 'success' && Array.isArray(valueRes.inquiryStatsByValues)
            ? valueRes.inquiryStatsByValues
            : null

        if (countData && valueData) {
          setCountRows(countData)
          setValueRows(valueData)
        } else {
          setCountRows([])
          setValueRows([])
          setError('Unable to load inquiry source mix.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setCountRows([])
        setValueRows([])
        setError('Unable to load inquiry source mix.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadInquirySourceMix()

    return () => controller.abort()
  }, [startDate, endDate])

  const isValueMetric = activeMetric === 'value'
  const rows = isValueMetric
    ? valueRows.map((item) => ({
        label: item.source || 'Unattributed',
        value: Number(item.totalValue) || 0,
      }))
    : countRows.map((item) => ({
        label: item.source || 'Unattributed',
        value: Number(item.count) || 0,
      }))

  return (
    <RankedMetricBreakdownCard
      metricTitle="Inquiry Source Mix"
      dimensionLabel="Inquiry Source"
      labelHeader="Inquiry Source"
      totalLabel={isValueMetric ? 'Total quotation value' : 'Total inquiries'}
      valueColumnLabel={isValueMetric ? 'Value (RM)' : 'Count'}
      rows={rows}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      formatValue={
        isValueMetric
          ? (value) => `RM ${Number(value || 0).toLocaleString()}`
          : (value) => Number(value || 0).toLocaleString()
      }
      barColorClass="bg-primary"
      headerActions={
        <CButtonGroup size="sm" role="group" aria-label="Select inquiry source metric">
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
            Count
          </CButton>
        </CButtonGroup>
      }
    />
  )
}

export default InquirySourceMix
