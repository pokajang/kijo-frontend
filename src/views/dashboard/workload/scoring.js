import { WORKLOAD_SCORE_WEIGHTS, WORKLOAD_TONE_THRESHOLDS } from './constants'

export const getWorkloadTone = (row = {}) => {
  const { danger, warning } = WORKLOAD_TONE_THRESHOLDS
  const score = Number(row.score || 0)
  const activeTasks = Number(row.activeTasks || 0)
  const overdueTasks = Number(row.overdueTasks || 0)
  const dueSoonTasks = Number(row.dueSoonTasks || 0)

  if (
    score >= danger.score ||
    activeTasks >= danger.activeTasks ||
    overdueTasks >= danger.overdueTasks
  ) {
    return 'danger'
  }

  if (
    score >= warning.score ||
    activeTasks >= warning.activeTasks ||
    overdueTasks >= warning.overdueTasks ||
    dueSoonTasks >= warning.dueSoonTasks
  ) {
    return 'warning'
  }

  return 'success'
}

export const getWorkloadScoreLines = (row = {}) => [
  {
    label: 'Active tasks',
    count: Number(row.activeTasks || 0),
    weight: WORKLOAD_SCORE_WEIGHTS.activeTasks,
  },
  {
    label: 'Overdue tasks',
    count: Number(row.overdueTasks || 0),
    weight: WORKLOAD_SCORE_WEIGHTS.overdueTasks,
  },
  {
    label: 'Due soon tasks',
    count: Number(row.dueSoonTasks || 0),
    weight: WORKLOAD_SCORE_WEIGHTS.dueSoonTasks,
  },
  {
    label: 'Project responsibility',
    count: Number(row.projectTaggedActiveTasks || 0),
    weight: WORKLOAD_SCORE_WEIGHTS.projectTaggedActiveTasks,
  },
]

export const sumScoreLines = (lines) =>
  lines.reduce((total, line) => total + line.count * line.weight, 0)

export const getBackendScoreBreakdownLines = (row = {}) =>
  Array.isArray(row.scoreBreakdown)
    ? row.scoreBreakdown
        .filter((line) => String(line?.label || '').trim())
        .map((line) => ({
          label: String(line.label),
          points: Number(line.points || 0),
        }))
    : []

export const sumScoreBreakdownPoints = (lines) =>
  lines.reduce((total, line) => total + Number(line.points || 0), 0)
