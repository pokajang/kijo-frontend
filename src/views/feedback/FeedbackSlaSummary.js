import React, { useMemo } from 'react'
import { CAlert, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { StatsStrip } from '../../components/stats'

const formatPercent = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : 'Pending'
}

const formatTarget = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : '90.0%'
}

const getCurrentMonthKey = (year) => {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year || today.getFullYear()}-${month}`
}

const getSummaryRow = (rows = [], year) => {
  const validRows = rows.filter((row) => row?.month)
  if (!validRows.length) return null

  const currentMonth = getCurrentMonthKey(year)
  return (
    validRows.find((row) => row.month === currentMonth) ||
    [...validRows].sort((left, right) => String(right.month).localeCompare(String(left.month)))[0]
  )
}

const FeedbackSlaSummary = ({
  rows = [],
  loading = false,
  error = '',
  year,
  targetPercent = 90,
}) => {
  const summaryRow = useMemo(() => getSummaryRow(rows, year), [rows, year])
  const monthLabel = summaryRow?.month_label || summaryRow?.month || 'Current month'
  const currentSla = formatPercent(summaryRow?.sla_percent)
  const reportedCount = Number(summaryRow?.reported_count || 0)
  const missedCount = Number(summaryRow?.missed_30_count || 0)
  const openWindowCount = Number(summaryRow?.open_within_window_count || 0)
  const needsTriageCount = Number(summaryRow?.needs_triage_count || 0)

  const items = [
    {
      key: 'target',
      label: 'SLA Target',
      value: formatTarget(targetPercent),
      sublabel: '30-Day Fix track',
      tone: 'primary',
    },
    {
      key: 'current',
      label: 'Latest SLA',
      value: currentSla,
      sublabel: monthLabel,
      tone:
        summaryRow?.sla_percent == null
          ? 'secondary'
          : Number(summaryRow.sla_percent) >= Number(targetPercent)
            ? 'success'
            : 'warning',
    },
    {
      key: 'reported',
      label: 'Reported',
      value: reportedCount,
      sublabel: monthLabel,
      tone: 'info',
    },
    {
      key: 'missed',
      label: 'Missed',
      value: missedCount,
      sublabel: 'Past 30 days',
      tone: missedCount > 0 ? 'danger' : 'success',
    },
    {
      key: 'pending',
      label: 'Pending Window',
      value: openWindowCount + needsTriageCount,
      sublabel: `${openWindowCount} open, ${needsTriageCount} triage`,
      tone: openWindowCount + needsTriageCount > 0 ? 'warning' : 'success',
    },
  ]

  return (
    <CCard className="mb-3" data-testid="feedback-sla-summary">
      <CCardHeader>
        <strong>Feedback SLA Snapshot</strong>{' '}
        <small className="text-muted">compact 30-day fix status</small>
      </CCardHeader>
      <CCardBody>
        {error ? (
          <CAlert color="warning" className="mb-0 py-2">
            {error}
          </CAlert>
        ) : (
          <StatsStrip items={items} loading={loading} layout="compact" />
        )}
      </CCardBody>
    </CCard>
  )
}

export default FeedbackSlaSummary
