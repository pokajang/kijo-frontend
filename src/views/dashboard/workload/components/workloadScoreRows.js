import { formatCount, formatCurrency } from '../formatters'
import {
  getBackendScoreBreakdownLines,
  getWorkloadScoreLines,
  sumScoreBreakdownPoints,
  sumScoreLines,
} from '../scoring'

const OVERDUE_PRESSURE_MULTIPLIER = 0.5
const DUE_SOON_PRESSURE_MULTIPLIER = 0.25
const DEADLINE_PRESSURE_FIXED_CAP = 4
const DEADLINE_PRESSURE_ACTIVE_BASE_CAP_RATIO = 0.35
const COMPLETED_ON_TIME_MULTIPLIER = 0.5
const COMPLETED_LATE_MULTIPLIER = 0.35
const PROJECT_BASE_POINTS = 1
const PROJECT_PROGRESS_POINTS_CAP = 2
const PROJECT_VALUE_BAND_CAP = 2

const countActiveTasks = (tasks = []) =>
  tasks.filter((task) => String(task?.status || '').toLowerCase() !== 'completed').length

const getActiveTasks = (tasks = []) =>
  tasks.filter((task) => String(task?.status || '').toLowerCase() !== 'completed')

const getTaskTitle = (task = {}, fallback = 'Task') => String(task.title || fallback).trim()

const getEffortScore = (task = {}) => {
  if (task.effortScore === undefined || task.effortScore === null || task.effortScore === '') {
    return 1
  }

  const effortScore = Number(task.effortScore)
  return Number.isFinite(effortScore) ? Math.max(0, effortScore) : 1
}

const sortTasksByEffortDesc = (tasks = []) =>
  [...tasks].sort((a, b) => {
    const effortDelta = getEffortScore(b) - getEffortScore(a)
    if (effortDelta !== 0) return effortDelta

    const bDate = String(b?.completedAt || b?.createdAt || b?.dueDate || '')
    const aDate = String(a?.completedAt || a?.createdAt || a?.dueDate || '')
    return bDate.localeCompare(aDate)
  })

const getProjectTaskPoints = (activeTasks = []) =>
  sortTasksByEffortDesc(activeTasks).reduce((total, task) => total + getEffortScore(task), 0)

const isTaskLinkedProgressUpdate = (update = {}) =>
  String(update.sourceType || '').toLowerCase() === 'task' || update.sourceTaskId != null

const getCompletedTasks = (row = {}) => [
  ...(Array.isArray(row.completedTasks) ? row.completedTasks : []),
  ...(row.projectGroups || []).flatMap((group) =>
    (Array.isArray(group.completedTasks) ? group.completedTasks : []).map((task) => ({
      ...task,
      projectName: task.projectName || group.projectName,
    })),
  ),
]

const getProjectResponsibilityDetails = (group = {}) => {
  const activeTaskCount = countActiveTasks(group.activeTasks)
  const activeTasks = getActiveTasks(group.activeTasks)
  const totalProgressCount = Array.isArray(group.progressUpdates) ? group.progressUpdates.length : 0
  const scoreableProgressCount = Number.isFinite(Number(group.scoreableProgressCount))
    ? Number(group.scoreableProgressCount)
    : (group.progressUpdates || []).filter((update) => !isTaskLinkedProgressUpdate(update)).length
  const hasProjectResponsibilitySignal = activeTaskCount > 0 || scoreableProgressCount > 0
  const basePoints = Number.isFinite(Number(group.projectBasePoints))
    ? Number(group.projectBasePoints)
    : hasProjectResponsibilitySignal
      ? PROJECT_BASE_POINTS
      : 0
  const taskPoints = Number.isFinite(Number(group.projectTaskPoints))
    ? Number(group.projectTaskPoints)
    : getProjectTaskPoints(activeTasks)
  const progressPoints = Number.isFinite(Number(group.projectProgressPoints))
    ? Number(group.projectProgressPoints)
    : hasProjectResponsibilitySignal
      ? Math.min(scoreableProgressCount, PROJECT_PROGRESS_POINTS_CAP)
      : 0
  const valueBand = Number(group.valueBand || 0)
  const valuePoints = Number.isFinite(Number(group.projectValuePoints))
    ? Number(group.projectValuePoints)
    : hasProjectResponsibilitySignal
      ? Math.min(valueBand, PROJECT_VALUE_BAND_CAP)
      : 0
  const roleWeight = Number(group.roleWeight || 0)
  const overheadPoints = Number.isFinite(Number(group.projectOverheadPoints))
    ? Number(group.projectOverheadPoints)
    : roundPoints((basePoints + progressPoints + valuePoints) * roleWeight)
  const roundedContribution =
    group.scoreContribution !== undefined && group.scoreContribution !== null
      ? Number(group.scoreContribution)
      : roundPoints(taskPoints + overheadPoints)

  return {
    activeTaskCount,
    progressCount: scoreableProgressCount,
    totalProgressCount,
    basePoints,
    taskPoints,
    progressPoints,
    valuePoints,
    valueBand,
    roleWeight,
    overheadPoints,
    roundedContribution,
  }
}

const getSummaryPoints = (line, hasBackendBreakdown) =>
  hasBackendBreakdown ? line.points : line.count * line.weight

const findBreakdownLine = (lines, label) => lines.find((line) => line.label === label)

const roundPoints = (value) => Math.round(Number(value || 0) * 100) / 100

const allocateRoundedPoints = (items, rawPointForItem) => {
  let rawTotal = 0
  let roundedTotal = 0

  return items.map((item, index) => {
    rawTotal += rawPointForItem(item, index)
    const nextRoundedTotal = roundPoints(rawTotal)
    const points = roundPoints(nextRoundedTotal - roundedTotal)
    roundedTotal = nextRoundedTotal

    return points
  })
}

const allocateProportionalRoundedPoints = (items, finalTotal) => {
  const rawTotal = items.reduce((total, item) => total + Number(item.rawPoints || 0), 0)
  if (rawTotal <= 0 || Number(finalTotal || 0) <= 0) return items.map(() => 0)

  const scale = Number(finalTotal) / rawTotal
  return allocateRoundedPoints(items, (item) => Number(item.rawPoints || 0) * scale)
}

const isLateCompletedTask = (task = {}) => {
  const dueDate = String(task.dueDate || '')
  const completedAt = String(task.completedAt || '')
  if (!dueDate || !completedAt) return false

  return completedAt > dueDate
}

const getCompletedWorkMultiplier = (task = {}) =>
  isLateCompletedTask(task) ? COMPLETED_LATE_MULTIPLIER : COMPLETED_ON_TIME_MULTIPLIER

const getCappedDeadlinePressure = (rawDeadlinePressure, row = {}) => {
  const activeWorkloadBase =
    Number(
      findBreakdownLine(getBackendScoreBreakdownLines(row), 'Non-project tasks')?.points || 0,
    ) +
    Number(
      findBreakdownLine(getBackendScoreBreakdownLines(row), 'Project responsibility')?.points || 0,
    )

  if (rawDeadlinePressure <= 0 || activeWorkloadBase <= 0) return 0

  return roundPoints(
    Math.min(
      rawDeadlinePressure,
      DEADLINE_PRESSURE_FIXED_CAP,
      activeWorkloadBase * DEADLINE_PRESSURE_ACTIVE_BASE_CAP_RATIO,
    ),
  )
}

const getNonProjectTaskRows = (row = {}) =>
  sortTasksByEffortDesc(getActiveTasks(row.otherTasks)).map((task, index) => {
    const effortScore = getEffortScore(task)
    return {
      key: task.id ?? `non-project-${index}`,
      item: getTaskTitle(task, `Non-project task ${index + 1}`),
      calculation: `${formatCount(effortScore)} effort, active task ${formatCount(index + 1)}`,
      points: effortScore,
    }
  })

const getProjectContributionRows = (row = {}) =>
  (row.projectGroups || []).map((group, index) => {
    const details = getProjectResponsibilityDetails(group)
    const capDetails = [
      details.progressCount > details.progressPoints
        ? `progress ${formatCount(details.progressCount)} capped to ${formatCount(details.progressPoints)}`
        : `${formatCount(details.progressPoints)} progress`,
      details.valueBand > details.valuePoints
        ? `value band ${formatCount(details.valueBand)} capped to ${formatCount(details.valuePoints)}`
        : `${formatCount(details.valuePoints)} value`,
    ].join(', ')

    return {
      key: group.projectId ?? `project-${index}`,
      item: group.projectName || 'Tagged Project',
      calculation: `${formatCount(details.taskPoints)} active task effort + ${formatCount(details.overheadPoints)} overhead (${formatCount(details.basePoints)} base, ${formatCount(details.progressPoints)} progress, ${formatCount(details.valuePoints)} value, ${details.roleWeight.toFixed(2)} role weight)`,
      detail: `${formatRole(group.projectRole)} role, ${formatCurrency(group.projectValue)}, ${formatCount(details.activeTaskCount)} active, ${formatCount(details.progressCount)} scoreable progress${details.totalProgressCount !== details.progressCount ? ` (${formatCount(details.totalProgressCount)} shown)` : ''}, ${capDetails}`,
      points: group.scoreContribution ?? details.roundedContribution,
    }
  })

const getDeadlineRows = (row = {}, deadlineTotal = null) => {
  const rows = []
  const activeNonProjectTasks = sortTasksByEffortDesc(getActiveTasks(row.otherTasks))
  const nonProjectOverdueTasks = activeNonProjectTasks.filter((task) => task.isOverdue)
  const nonProjectDueSoonTasks = activeNonProjectTasks.filter((task) => task.isDueSoon)

  nonProjectOverdueTasks.forEach((task, index) => {
    const effortScore = getEffortScore(task)
    rows.push({
      key: `non-project-overdue-${task.id ?? index}`,
      item: getTaskTitle(task, `Non-project overdue task ${index + 1}`),
      calculation: `${formatCount(effortScore)} effort x 0.5 overdue weight`,
      rawPoints: effortScore * OVERDUE_PRESSURE_MULTIPLIER,
    })
  })

  nonProjectDueSoonTasks.forEach((task, index) => {
    const effortScore = getEffortScore(task)
    rows.push({
      key: `non-project-due-soon-${task.id ?? index}`,
      item: getTaskTitle(task, `Non-project due soon task ${index + 1}`),
      calculation: `${formatCount(effortScore)} effort x 0.25 due-soon weight`,
      rawPoints: effortScore * DUE_SOON_PRESSURE_MULTIPLIER,
    })
  })
  ;(row.projectGroups || []).forEach((group, groupIndex) => {
    const activeProjectTasks = sortTasksByEffortDesc(getActiveTasks(group.activeTasks))
    const projectName = group.projectName || `Project ${groupIndex + 1}`
    const projectOverdueTasks = activeProjectTasks.filter((task) => task.isOverdue)
    const projectDueSoonTasks = activeProjectTasks.filter((task) => task.isDueSoon)

    projectOverdueTasks.forEach((task, index) => {
      const effortScore = getEffortScore(task)
      rows.push({
        key: `project-overdue-${group.projectId ?? groupIndex}-${task.id ?? index}`,
        item: `${projectName}: ${getTaskTitle(task, `Overdue task ${index + 1}`)}`,
        calculation: `${formatCount(effortScore)} effort x 0.5 overdue weight`,
        rawPoints: effortScore * OVERDUE_PRESSURE_MULTIPLIER,
      })
    })

    projectDueSoonTasks.forEach((task, index) => {
      const effortScore = getEffortScore(task)
      rows.push({
        key: `project-due-soon-${group.projectId ?? groupIndex}-${task.id ?? index}`,
        item: `${projectName}: ${getTaskTitle(task, `Due soon task ${index + 1}`)}`,
        calculation: `${formatCount(effortScore)} effort x 0.25 due-soon weight`,
        rawPoints: effortScore * DUE_SOON_PRESSURE_MULTIPLIER,
      })
    })
  })

  if (!rows.length) return []

  const rawTotal = rows.reduce(
    (total, deadlineRow) => total + Number(deadlineRow.rawPoints || 0),
    0,
  )
  const finalTotal =
    deadlineTotal == null ? getCappedDeadlinePressure(rawTotal, row) : deadlineTotal
  const isCapped = roundPoints(finalTotal) < roundPoints(rawTotal)
  const allocatedPoints = allocateProportionalRoundedPoints(rows, finalTotal)

  return [
    {
      type: 'empty',
      key: 'deadline-cap-note',
      item: 'Deadline pressure capped at lower of 4 or 35% of active workload base.',
    },
    ...rows.map((deadlineRow, index) => {
      const rowWithoutRawPoints = { ...deadlineRow }
      const rawPoints = Number(rowWithoutRawPoints.rawPoints || 0)
      delete rowWithoutRawPoints.rawPoints

      return {
        ...rowWithoutRawPoints,
        detail: isCapped ? `Raw ${formatCount(rawPoints)} before deadline cap` : '',
        points: allocatedPoints[index] || 0,
      }
    }),
  ]
}

const getCompletedWorkRows = (row = {}) => {
  const completedTasks = sortTasksByEffortDesc(getCompletedTasks(row))
  const completedPoints = allocateRoundedPoints(
    completedTasks,
    (task) => getEffortScore(task) * getCompletedWorkMultiplier(task),
  )

  return completedTasks.map((task, index) => {
    const effortScore = getEffortScore(task)
    const isLate = isLateCompletedTask(task)

    return {
      key: task.id ?? `completed-${index}`,
      item: getTaskTitle(task, `Completed task ${index + 1}`),
      calculation: `${formatCount(effortScore)} effort x ${
        isLate ? '35% late completed credit' : '50% on-time completed credit'
      }`,
      detail: [
        task.projectName ? `Project: ${task.projectName}` : '',
        task.completedAt ? `Completed ${task.completedAt}` : '',
      ]
        .filter(Boolean)
        .join(', '),
      points: completedPoints[index] || 0,
    }
  })
}

const formatRole = (role) => {
  const text = String(role || '').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Role not set'
}

export const buildWorkloadScoreTableRows = (row = {}) => {
  const backendScoreLines = getBackendScoreBreakdownLines(row)
  const fallbackScoreLines = getWorkloadScoreLines(row)
  const hasBackendBreakdown = backendScoreLines.length > 0
  const scoreLines = hasBackendBreakdown ? backendScoreLines : fallbackScoreLines
  const breakdownTotal = hasBackendBreakdown
    ? sumScoreBreakdownPoints(backendScoreLines)
    : sumScoreLines(fallbackScoreLines)
  const nonProjectTaskRows = getNonProjectTaskRows(row)
  const projectContributionRows = getProjectContributionRows(row)

  if (!hasBackendBreakdown) {
    return [
      ...scoreLines.map((line) => ({
        type: 'section',
        key: `section-${line.label}`,
        item: line.label,
        points: getSummaryPoints(line, hasBackendBreakdown),
      })),
      {
        type: 'total',
        key: 'total',
        item: 'Total Score',
        points: breakdownTotal,
      },
    ]
  }

  const nonProjectLine = findBreakdownLine(scoreLines, 'Non-project tasks')
  const projectLine = findBreakdownLine(scoreLines, 'Project responsibility')
  const deadlineLine = findBreakdownLine(scoreLines, 'Deadline pressure')
  const completedWorkLine = findBreakdownLine(scoreLines, 'Completed work')
  const deadlineRows = getDeadlineRows(row, deadlineLine?.points)
  const completedWorkRows = getCompletedWorkRows(row)

  return [
    {
      type: 'section',
      key: 'section-non-project',
      item: 'Non Project Tasks Score',
      points: nonProjectLine?.points || 0,
    },
    ...(nonProjectTaskRows.length
      ? nonProjectTaskRows
      : [
          {
            type: 'empty',
            key: 'empty-non-project',
            item: 'No active non-project tasks.',
          },
        ]),
    {
      type: 'section',
      key: 'section-project',
      item: 'Project Task / Responsibility Score',
      points: projectLine?.points || 0,
    },
    ...(projectContributionRows.length
      ? projectContributionRows
      : [
          {
            type: 'empty',
            key: 'empty-project',
            item: 'No weighted project activity for this staff member.',
          },
        ]),
    {
      type: 'section',
      key: 'section-deadline',
      item: 'Deadline Pressure Score',
      points: deadlineLine?.points || 0,
    },
    ...(deadlineRows.length
      ? deadlineRows
      : [
          {
            type: 'empty',
            key: 'empty-deadline',
            item: 'No overdue or due-soon tasks.',
          },
        ]),
    {
      type: 'section',
      key: 'section-completed-work',
      item: 'Completed Work Score',
      points: completedWorkLine?.points || 0,
    },
    ...(completedWorkRows.length
      ? completedWorkRows
      : [
          {
            type: 'empty',
            key: 'empty-completed-work',
            item: 'No completed tasks in this period.',
          },
        ]),
    {
      type: 'total',
      key: 'total',
      item: 'Total Score',
      points: breakdownTotal,
    },
  ]
}
