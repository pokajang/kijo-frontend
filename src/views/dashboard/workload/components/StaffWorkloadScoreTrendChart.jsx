import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { CChartLine } from '@coreui/react-chartjs'
import { formatDateLocal } from '../formatters'
import { useChartSemanticColors, useChartTickColor } from '../../../../utils/chartTheme'

const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatScore = (value) => {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, '')
}

const parseDateKey = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

const cloneDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date, days) => {
  const next = cloneDate(date)
  next.setDate(next.getDate() + days)
  return next
}

const minDate = (a, b) => (a <= b ? a : b)
const maxDate = (a, b) => (a >= b ? a : b)

const countDaysInclusive = (startDate, endDate) =>
  Math.max(1, Math.round((endDate - startDate) / DAY_MS) + 1)

const formatMonthDay = (date) => `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`
const formatMonthYear = (date) => `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
const formatTooltipDate = (date) => `${formatMonthDay(date)}, ${date.getFullYear()}`

const formatRangeLabel = (startDate, endDate, includeYear = false) => {
  if (formatDateLocal(startDate) === formatDateLocal(endDate)) {
    return includeYear ? formatTooltipDate(startDate) : formatMonthDay(startDate)
  }

  const sameMonth =
    startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()

  if (sameMonth) {
    return `${formatMonthDay(startDate)}-${endDate.getDate()}${
      includeYear ? `, ${endDate.getFullYear()}` : ''
    }`
  }

  if (!includeYear) return `${formatMonthDay(startDate)}-${formatMonthDay(endDate)}`

  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${formatMonthDay(startDate)}-${formatMonthDay(endDate)}, ${endDate.getFullYear()}`
  }

  return `${formatTooltipDate(startDate)}-${formatTooltipDate(endDate)}`
}

const getAggregationMode = (days) => {
  if (days <= 45) return 'daily'
  if (days <= 180) return 'weekly'
  return 'monthly'
}

const averageScore = (points) => {
  if (points.length === 0) return null

  const total = points.reduce((sum, point) => sum + Number(point.score || 0), 0)
  return Number((total / points.length).toFixed(2))
}

const getCaptureMode = (points) => {
  const modes = new Set(points.map((point) => point.captureMode || 'captured'))
  if (modes.size === 0) return 'missing'
  if (modes.size === 1) return [...modes][0]
  return 'mixed'
}

const buildDailyDisplayPoints = ({ startDate, endDate, pointsByDate }) => {
  const displayPoints = []

  for (let date = cloneDate(startDate); date <= endDate; date = addDays(date, 1)) {
    const dateKey = formatDateLocal(date)
    const point = pointsByDate.get(dateKey)
    const score = point ? Number(point.score || 0) : null

    displayPoints.push({
      label: formatMonthDay(date),
      tooltipLabel: formatTooltipDate(date),
      score,
      captureMode: point?.captureMode || 'missing',
      snapshotCount: point ? 1 : 0,
      mode: 'daily',
    })
  }

  return displayPoints
}

const startOfWeek = (date) => addDays(date, -((date.getDay() + 6) % 7))
const endOfWeek = (date) => addDays(startOfWeek(date), 6)

const buildWeeklyDisplayPoints = ({ startDate, endDate, sortedPoints }) => {
  const displayPoints = []

  for (let cursor = cloneDate(startDate); cursor <= endDate; ) {
    const bucketStart = cloneDate(cursor)
    const bucketEnd = minDate(endOfWeek(bucketStart), endDate)
    const bucketPoints = sortedPoints.filter((point) => {
      const pointDate = parseDateKey(point.date)
      return pointDate && pointDate >= bucketStart && pointDate <= bucketEnd
    })

    displayPoints.push({
      label: formatRangeLabel(bucketStart, bucketEnd),
      tooltipLabel: formatRangeLabel(bucketStart, bucketEnd, true),
      score: averageScore(bucketPoints),
      captureMode: getCaptureMode(bucketPoints),
      snapshotCount: bucketPoints.length,
      mode: 'weekly',
    })

    cursor = addDays(bucketEnd, 1)
  }

  return displayPoints
}

const buildMonthlyDisplayPoints = ({ startDate, endDate, sortedPoints }) => {
  const displayPoints = []

  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    cursor <= endDate;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const monthStart = maxDate(cursor, startDate)
    const monthEnd = minDate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), endDate)
    const bucketPoints = sortedPoints.filter((point) => {
      const pointDate = parseDateKey(point.date)
      return pointDate && pointDate >= monthStart && pointDate <= monthEnd
    })

    displayPoints.push({
      label: formatMonthYear(cursor),
      tooltipLabel: formatMonthYear(cursor),
      score: averageScore(bucketPoints),
      captureMode: getCaptureMode(bucketPoints),
      snapshotCount: bucketPoints.length,
      mode: 'monthly',
    })
  }

  return displayPoints
}

const buildTrendData = ({ points, startDate, endDate }) => {
  const sortedPoints = points
    .filter((point) => parseDateKey(point.date))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const fallbackStart = parseDateKey(sortedPoints[0]?.date)
  const fallbackEnd = parseDateKey(sortedPoints[sortedPoints.length - 1]?.date)
  const resolvedStart = parseDateKey(startDate) || fallbackStart
  const resolvedEnd = parseDateKey(endDate) || fallbackEnd

  if (!resolvedStart || !resolvedEnd) {
    return { mode: 'daily', displayPoints: [] }
  }

  const rangeStart = minDate(resolvedStart, resolvedEnd)
  const rangeEnd = maxDate(resolvedStart, resolvedEnd)
  const mode = getAggregationMode(countDaysInclusive(rangeStart, rangeEnd))
  const pointsByDate = new Map(sortedPoints.map((point) => [point.date, point]))

  if (mode === 'daily') {
    return {
      mode,
      displayPoints: buildDailyDisplayPoints({
        startDate: rangeStart,
        endDate: rangeEnd,
        pointsByDate,
      }),
    }
  }

  if (mode === 'weekly') {
    return {
      mode,
      displayPoints: buildWeeklyDisplayPoints({
        startDate: rangeStart,
        endDate: rangeEnd,
        sortedPoints,
      }),
    }
  }

  return {
    mode,
    displayPoints: buildMonthlyDisplayPoints({
      startDate: rangeStart,
      endDate: rangeEnd,
      sortedPoints,
    }),
  }
}

const getModeCaption = (mode) => {
  if (mode === 'weekly') return 'Weekly average'
  if (mode === 'monthly') return 'Monthly average'
  return 'Daily score'
}

const getCaptureSuffix = (captureMode) => {
  if (captureMode === 'reconstructed') return ' (reconstructed)'
  if (captureMode === 'mixed') return ' (mixed capture)'
  return ''
}

const getTooltipLabel = (point) => {
  if (!point) return 'No workload snapshot'
  if (point.score === null) return `${point.tooltipLabel}: no workload snapshot`

  const suffix = getCaptureSuffix(point.captureMode)

  if (point.mode === 'daily') {
    return `${point.tooltipLabel}: ${formatScore(point.score)}${suffix}`
  }

  const noun = point.snapshotCount === 1 ? 'snapshot' : 'snapshots'
  return `${point.tooltipLabel}: avg ${formatScore(point.score)} from ${
    point.snapshotCount
  } ${noun}${suffix}`
}

const WorkloadScoreChartCanvas = ({ points, startDate, endDate }) => {
  const tickColor = useChartTickColor()
  const chartColors = useChartSemanticColors()
  const { mode, displayPoints } = useMemo(
    () => buildTrendData({ points, startDate, endDate }),
    [endDate, points, startDate],
  )
  const chartData = useMemo(
    () => ({
      labels: displayPoints.map((point) => point.label),
      datasets: [
        {
          label: 'Workload score',
          data: displayPoints.map((point) => point.score),
          backgroundColor: 'transparent',
          borderColor: chartColors.primary,
          borderWidth: 2,
          pointBackgroundColor: chartColors.primary,
          pointBorderColor: chartColors.primary,
          pointRadius: mode === 'daily' ? 2.5 : 3,
          pointHoverRadius: 5,
          spanGaps: false,
          tension: 0.35,
        },
      ],
    }),
    [chartColors.primary, displayPoints, mode],
  )

  return (
    <div className="px-3 pb-3 pt-2">
      <div className="text-muted small mb-2">{getModeCaption(mode)}</div>
      <div className="position-relative w-100" style={{ minHeight: '300px' }}>
        <CChartLine
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => getTooltipLabel(displayPoints[context.dataIndex]),
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  autoSkip: true,
                  color: tickColor,
                  maxRotation: 0,
                  maxTicksLimit: 10,
                  minRotation: 0,
                },
              },
              y: {
                beginAtZero: true,
                grid: { display: false },
                ticks: {
                  color: tickColor,
                  maxTicksLimit: 6,
                  callback: (value) => formatScore(value),
                },
                title: {
                  display: true,
                  text: 'Workload score',
                  color: tickColor,
                },
              },
            },
            elements: {
              line: { borderWidth: 2, tension: 0.35 },
              point: { hitRadius: 10 },
            },
          }}
        />
      </div>
    </div>
  )
}

WorkloadScoreChartCanvas.propTypes = {
  points: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      score: PropTypes.number,
      captureMode: PropTypes.string,
    }),
  ).isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
}

const StaffWorkloadScoreTrendChart = ({
  history,
  loading = false,
  error = '',
  startDate,
  endDate,
}) => {
  const points = Array.isArray(history?.points) ? history.points : []

  if (loading) {
    return <div className="text-center text-muted py-4">Loading workload history...</div>
  }

  if (error) {
    return <div className="text-center text-danger py-4">{error}</div>
  }

  if (points.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        No daily workload snapshots found for this period.
      </div>
    )
  }

  return <WorkloadScoreChartCanvas points={points} startDate={startDate} endDate={endDate} />
}

StaffWorkloadScoreTrendChart.propTypes = {
  history: PropTypes.shape({
    points: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string,
        score: PropTypes.number,
        captureMode: PropTypes.string,
      }),
    ),
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
}

export default StaffWorkloadScoreTrendChart
