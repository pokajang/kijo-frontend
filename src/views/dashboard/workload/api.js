import { buildQueryUrl, fetchJson, fetchJsonGet } from '../shared/fetchUtils'
import { getWorkTypeLabel, workloadWorkTypes } from './components/workTypes'

const num = (value) => Number(value || 0)
const optionalNum = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return Number(candidate || 0)
    }
  }

  return undefined
}
const str = (value) => String(value ?? '').trim()
const bool = (value) => value === true || value === 1 || value === '1' || value === 'true'
const arr = (...candidates) => candidates.find((candidate) => Array.isArray(candidate)) || []
const nullableId = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') return candidate
  }
  return null
}
const knownWorkTypes = new Set(workloadWorkTypes.map((type) => type.key))
const normalizeWorkTypeKey = (value) => {
  const workType = str(value)
  return knownWorkTypes.has(workType) ? workType : 'unclear'
}

const normalizeTask = (task = {}) => {
  const workType = normalizeWorkTypeKey(task.workType || task.work_type)

  return {
    id: nullableId(task.id),
    title: str(task.title),
    status: str(task.status),
    staffId: nullableId(task.staffId, task.staff_id),
    staffCode: str(task.staffCode || task.staff_code),
    staffName: str(task.staffName || task.full_name),
    createdAt: str(task.createdAt || task.created_at),
    completedAt: str(task.completedAt || task.completed_at),
    dueDate: str(task.dueDate || task.due_date),
    projectId: nullableId(task.projectId, task.project_id),
    projectName: str(task.projectName || task.project_name),
    taskCategory: str(task.taskCategory || task.task_category) || 'uncategorised',
    effortScore: num(task.effortScore ?? task.effort_score ?? 1),
    classificationConfidence:
      str(task.classificationConfidence || task.classification_confidence) || 'low',
    classificationSource: str(task.classificationSource || task.classification_source) || 'system',
    userOverride: bool(task.userOverride ?? task.user_override),
    matchedPattern: str(task.matchedPattern || task.matched_pattern),
    workType,
    workTypeLabel: getWorkTypeLabel(workType),
    workTypeConfidence: str(task.workTypeConfidence || task.work_type_confidence) || 'low',
    workTypeMatchedPattern: str(task.workTypeMatchedPattern || task.work_type_matched_pattern),
    aiClassificationStatus:
      str(task.aiClassificationStatus || task.ai_classification_status) || 'not_applicable',
    isOverdue: bool(task.isOverdue ?? task.is_overdue),
    isDueSoon: bool(task.isDueSoon ?? task.is_due_soon),
    isActive: bool(task.isActive ?? task.is_active),
  }
}

const normalizeProgressUpdate = (update = {}) => ({
  id: nullableId(update.id),
  projectId: nullableId(update.projectId, update.project_id),
  projectName: str(update.projectName || update.project_name),
  progressDate: str(update.progressDate || update.progress_date),
  progressText: str(update.progressText || update.progress_text),
  sourceType: str(update.sourceType || update.source_type).toLowerCase(),
  sourceTaskId: nullableId(update.sourceTaskId, update.source_task_id),
})

const normalizeScoreBreakdownLine = (line = {}) => ({
  label: str(line.label),
  points: num(line.points),
})

const normalizeWorkTypeBreakdownLine = (line = {}) => {
  const workType = normalizeWorkTypeKey(line.workType || line.work_type)

  return {
    workType,
    workTypeLabel: getWorkTypeLabel(workType),
    activeCount: num(line.activeCount ?? line.active_count),
    completedCount: num(line.completedCount ?? line.completed_count),
    taskCount: num(line.taskCount ?? line.task_count),
    effortPoints: num(line.effortPoints ?? line.effort_points),
  }
}

const normalizeProjectGroup = (group = {}) => ({
  projectId: nullableId(group.projectId, group.project_id),
  projectName: str(group.projectName || group.project_name),
  clientName: str(group.clientName || group.client_name),
  projectValue: num(
    group.projectValue ?? group.project_value ?? group.quoteValue ?? group.quote_value,
  ),
  projectRole: str(group.projectRole || group.project_role),
  roleWeight: num(group.roleWeight ?? group.role_weight),
  valueBand: num(group.valueBand ?? group.value_band),
  scoreContribution: optionalNum(group.scoreContribution, group.score_contribution),
  scoreableProgressCount: num(group.scoreableProgressCount ?? group.scoreable_progress_count),
  projectTaskPoints: optionalNum(group.projectTaskPoints, group.project_task_points),
  projectBasePoints: optionalNum(group.projectBasePoints, group.project_base_points),
  projectProgressPoints: optionalNum(group.projectProgressPoints, group.project_progress_points),
  projectValuePoints: optionalNum(group.projectValuePoints, group.project_value_points),
  projectOverheadPoints: optionalNum(group.projectOverheadPoints, group.project_overhead_points),
  activeTasks: arr(group.activeTasks, group.active_tasks).map(normalizeTask),
  completedTasks: arr(group.completedTasks, group.completed_tasks).map(normalizeTask),
  progressUpdates: arr(group.progressUpdates, group.progress_updates).map(normalizeProgressUpdate),
})

export const normalizeStaffRow = (row = {}, fallbackIndex = 0, metadata = {}) => {
  const staffCode = str(row.staffCode)
  const staffName = str(row.staffName)
  const staffLabel = str(row.staffLabel)
  const projectGroups = arr(row.projectGroups, row.project_groups).map(normalizeProjectGroup)
  const staffKey = String(
    row.staffKey ?? row.staffId ?? staffCode ?? staffLabel ?? `staff-${fallbackIndex}`,
  )

  return {
    staffKey,
    staffId: nullableId(row.staffId, row.staff_id),
    staffCode,
    staffName,
    staffLabel,
    staffCompactLabel: str(row.staffCompactLabel) || staffCode || staffName || staffLabel,
    asOfDate: str(row.asOfDate || row.as_of_date || metadata.asOfDate || metadata.as_of_date),
    completedWindow:
      row.completedWindow || row.completed_window || metadata.completedWindow || null,
    score: num(row.score),
    activeTasks: num(row.activeTasks),
    overdueTasks: num(row.overdueTasks),
    dueSoonTasks: num(row.dueSoonTasks),
    projectTaggedActiveTasks: num(row.projectTaggedActiveTasks),
    projectGroupCount: num(
      row.projectGroupCount ?? row.project_group_count ?? projectGroups.length,
    ),
    completedInPeriod: num(row.completedInPeriod),
    lateCompletedInPeriod: num(row.lateCompletedInPeriod),
    avgDaysLapsed: num(row.avgDaysLapsed),
    scoreBreakdown: (Array.isArray(row.scoreBreakdown) ? row.scoreBreakdown : []).map(
      normalizeScoreBreakdownLine,
    ),
    workTypeBreakdown: arr(row.workTypeBreakdown, row.work_type_breakdown).map(
      normalizeWorkTypeBreakdownLine,
    ),
    projectGroups,
    otherTasks: arr(row.otherTasks, row.other_tasks).map(normalizeTask),
    completedTasks: arr(row.completedTasks, row.completed_tasks).map(normalizeTask),
  }
}

export const fetchWorkload = async ({ startDate, endDate, signal }) => {
  const response = await fetchJsonGet(
    `${import.meta.env.VITE_API_BASE}stats/workload`,
    { start_date: startDate, end_date: endDate },
    signal,
  )

  if (response?.status !== 'success') {
    const error = new Error(response?.message || 'Workload request did not succeed.')
    error.cause = 'workload-response'
    throw error
  }

  const metadata = {
    asOfDate: response.asOfDate || response.as_of_date,
    completedWindow: response.completedWindow || response.completed_window || null,
  }

  return (Array.isArray(response.staff) ? response.staff : []).map((row, index) =>
    normalizeStaffRow(row, index, metadata),
  )
}

const normalizeHistoryPoint = (point = {}) => ({
  date: str(point.date || point.snapshotDate || point.snapshot_date),
  score: num(point.score),
  captureMode: str(point.captureMode || point.capture_mode || 'captured') || 'captured',
})

export const normalizeWorkloadHistoryRow = (row = {}, fallbackIndex = 0) => {
  const staffCode = str(row.staffCode || row.staff_code)
  const staffName = str(row.staffName || row.staff_name)
  const staffKey = String(
    row.staffKey ??
      row.staff_key ??
      row.staffId ??
      row.staff_id ??
      staffCode ??
      `staff-${fallbackIndex}`,
  )

  return {
    staffKey,
    staffId: nullableId(row.staffId, row.staff_id),
    staffCode,
    staffName,
    points: arr(row.points)
      .map(normalizeHistoryPoint)
      .filter((point) => point.date),
  }
}

export const fetchWorkloadHistory = async ({ startDate, endDate, signal }) => {
  const response = await fetchJsonGet(
    `${import.meta.env.VITE_API_BASE}stats/workload/history`,
    { start_date: startDate, end_date: endDate },
    signal,
  )

  if (response?.status !== 'success') {
    const error = new Error(response?.message || 'Workload history request did not succeed.')
    error.cause = 'workload-history-response'
    throw error
  }

  return {
    startDate: str(response.startDate || response.start_date),
    endDate: str(response.endDate || response.end_date),
    staff: (Array.isArray(response.staff) ? response.staff : []).map(normalizeWorkloadHistoryRow),
  }
}

export const createWorkloadShare = async ({ startDate, endDate, signal } = {}) => {
  const response = await fetchJson(
    `${import.meta.env.VITE_API_BASE}stats/workload/share`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    },
    signal,
  )

  if (response?.status !== 'success' || !response.token) {
    const error = new Error(response?.message || 'Workload share request did not succeed.')
    error.cause = 'workload-share-response'
    throw error
  }

  return {
    token: response.token,
    path: response.path || `/share/workload/${response.token}`,
    expiresAt: str(response.expiresAt || response.expires_at),
  }
}

export const fetchSharedWorkload = async ({ token, signal } = {}) => {
  const response = await fetchJsonGet(
    `${import.meta.env.VITE_API_BASE}stats/workload/share/${encodeURIComponent(token || '')}`,
    {},
    { credentials: 'omit', silentError: true },
    signal,
  )

  if (response?.status !== 'success') {
    const error = new Error(response?.message || 'Shared workload dashboard is unavailable.')
    error.cause = 'workload-share-response'
    throw error
  }

  const metadata = {
    asOfDate: response.asOfDate || response.as_of_date,
    completedWindow: response.completedWindow || response.completed_window || null,
  }

  return {
    staffRows: (Array.isArray(response.staff) ? response.staff : []).map((row, index) =>
      normalizeStaffRow(row, index, metadata),
    ),
    asOfDate: str(metadata.asOfDate),
    completedWindow: metadata.completedWindow,
    share: response.share || null,
  }
}

export const getWorkloadPdfUrl = ({ startDate, endDate } = {}) =>
  buildQueryUrl(`${import.meta.env.VITE_API_BASE}stats/workload/pdf`, {
    start_date: startDate,
    end_date: endDate,
  })
