import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailFields, DataTableDetailShell } from '../../components/datatable'
import dialog from '../../components/dialog/dialogService'
import { fetchJson, findRecordById } from '../../utils/detailPages'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'
import { getDaysLapsedInfo, getStatusText } from './actionHandlers'
import { showToast } from '../../components/toast/toastService'
import CarryForwardModal from './weekly/CarryForwardModal'
import TaskActivityList from './weekly/TaskActivityList'
import WeeklyUpdateModal from './weekly/WeeklyUpdateModal'

const API_BASE = import.meta.env.VITE_API_BASE

const formatCommentLogs = (logs = []) =>
  logs.length
    ? logs
        .map((log) => `${log.text || '-'} (${new Date(log.timestamp).toLocaleString()})`)
        .join('\n')
    : '-'

const sourceLabels = {
  system: 'Local rules',
  ai: 'AI',
  ai_cache: 'Learned',
  user: 'Manual',
}

const aiStatusLabels = {
  not_applicable: 'Not needed',
  pending: 'Pending',
  queued: 'Queued',
  processing: 'Processing',
  applied: 'Applied',
  cached: 'Learned',
  no_result: 'No useful AI result',
  failed: 'Failed',
  stale: 'Delayed',
}

const formatSource = (source) => sourceLabels[String(source || '').trim()] || source || '-'
const formatAiStatus = (status) => aiStatusLabels[String(status || '').trim()] || status || '-'
const formatScore = (score) => {
  const value = Number(score)
  if (!Number.isFinite(value)) return '-'

  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeTask = (task, todayStr) => {
  if (!task) return null
  const statusText = task.statusText || getStatusText(task, todayStr)
  const daysLapsed = getDaysLapsedInfo(task, todayStr)
  return {
    ...task,
    title: task.title || '-',
    statusText,
    daysLapsed: daysLapsed.display,
    commentSummary: task.commentSummary || formatCommentLogs(task.commentLogs || []),
  }
}

const TaskDetailPage = ({ scope = 'personal' }) => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const todayStr = formatDateLocal(new Date())
  const isStaffScope = scope === 'staff'
  const returnTo = getDetailReturnTo(location, isStaffScope ? '/staff/tasks' : '/task-manager')
  const [task, setTask] = useState(() => normalizeTask(location.state?.record, todayStr))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [weeklyUpdateVisible, setWeeklyUpdateVisible] = useState(false)
  const [carryForwardVisible, setCarryForwardVisible] = useState(false)
  const [activityRefreshToken, setActivityRefreshToken] = useState(0)

  const loadTask = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson(`${API_BASE}${isStaffScope ? 'tasks' : 'tasks/personal'}`)
      const records = Array.isArray(data?.tasks) ? data.tasks : []
      const found = findRecordById(records, taskId)
      setTask(normalizeTask(found, todayStr))
      if (!found) setError('Task record not found.')
    } catch (err) {
      setError(err?.message || 'Unable to load task details.')
    } finally {
      setLoading(false)
    }
  }, [isStaffScope, taskId, todayStr])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  const addComment = useCallback(async () => {
    const text = await dialog.prompt('Enter comment:')
    if (!text) return
    try {
      const data = await fetchJson(`${API_BASE}tasks/${encodeURIComponent(taskId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, text }),
      })
      if (data.status !== 'success') throw new Error(data.message || 'Failed to add comment')
      await loadTask()
    } catch (err) {
      dialog.alert(err?.message || 'Failed to add comment.')
    }
  }, [loadTask, taskId])

  const markCompleted = useCallback(async () => {
    if (!(await dialog.confirm('Are you sure you want to mark this task as completed?'))) return
    try {
      const data = await fetchJson(`${API_BASE}tasks/${encodeURIComponent(taskId)}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ task_id: taskId }),
      })
      if (data.status !== 'success')
        throw new Error(data.message || 'Failed to mark task completed')
      await loadTask()
      setActivityRefreshToken((value) => value + 1)
    } catch (err) {
      dialog.alert(err?.message || 'Failed to mark task completed.')
    }
  }, [loadTask, taskId])

  const deleteTask = useCallback(async () => {
    if (
      !(await dialog.confirm('Are you sure you want to delete this task?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const data = await fetchJson(`${API_BASE}tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        body: JSON.stringify({ task_id: taskId }),
      })
      if (data.status !== 'success') throw new Error(data.message || 'Failed to delete task')
      navigate(returnTo)
    } catch (err) {
      dialog.alert(err?.message || 'Failed to delete task.')
    }
  }, [navigate, returnTo, taskId])

  const refreshAfterWeeklyActivity = useCallback(
    async (data) => {
      await loadTask()
      setActivityRefreshToken((value) => value + 1)
      showToast(data.message || 'Task activity saved.')
    },
    [loadTask],
  )

  const actions = useMemo(() => {
    if (isStaffScope || !task || task.statusText.startsWith('Completed')) return []
    return [
      {
        key: 'add-weekly-update',
        label: 'Add Weekly Update',
        onClick: () => setWeeklyUpdateVisible(true),
      },
      { key: 'add-comment', label: 'Add Comment', onClick: addComment },
      { key: 'carry-forward', label: 'Carry Forward', onClick: () => setCarryForwardVisible(true) },
      { key: 'mark-completed', label: 'Mark Completed', onClick: markCompleted },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: task.statusText !== 'Ongoing',
        tooltip: task.statusText !== 'Ongoing' ? 'Only ongoing tasks can be deleted.' : undefined,
        onClick: deleteTask,
      },
    ]
  }, [addComment, deleteTask, isStaffScope, markCompleted, task])

  return (
    <DataTableDetailShell
      title={isStaffScope ? 'Staff Task Details' : 'Task Details'}
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={task}
      actions={actions}
      emptyMessage="Task record not found."
    >
      <DataTableDetailFields
        fields={[
          { key: 'title', label: 'Task', value: task?.title, xs: 12 },
          { key: 'staff', label: 'Staff', value: task?.staffName, hidden: !isStaffScope },
          { key: 'project', label: 'Project', value: task?.projectName || '-' },
          { key: 'status', label: 'Status', value: task?.statusText },
          { key: 'created', label: 'Created On', value: task?.createdAt },
          { key: 'due', label: 'Due Date', value: task?.dueDate },
          { key: 'completed', label: 'Completed At', value: task?.completedAt },
          { key: 'days', label: 'Days Lapsed', value: task?.daysLapsed },
          {
            key: 'comments',
            label: 'Comment Logs',
            value: <span style={{ whiteSpace: 'pre-wrap' }}>{task?.commentSummary || '-'}</span>,
            xs: 12,
          },
        ]}
      />
      <div className="border-top mt-4 pt-3">
        <h6 className="mb-3">Activity History</h6>
        <TaskActivityList
          task={task}
          showActor={isStaffScope}
          refreshToken={activityRefreshToken}
        />
      </div>
      <div className="border-top mt-4 pt-3">
        <h6 className="mb-3">Classification</h6>
        <DataTableDetailFields
          fields={[
            {
              key: 'task-type',
              label: 'Task Type',
              value: task?.taskCategoryLabel || task?.taskCategory || '-',
            },
            {
              key: 'effort-score',
              label: 'Effort Score',
              value: formatScore(task?.effortScore),
            },
            {
              key: 'work-type',
              label: 'Work Type',
              value: task?.workTypeLabel || task?.workType || '-',
            },
            {
              key: 'classification-source',
              label: 'Source',
              value: formatSource(task?.classificationSource),
            },
            {
              key: 'classification-confidence',
              label: 'Confidence',
              value: task?.classificationConfidence || '-',
            },
            {
              key: 'ai-status',
              label: 'AI Status',
              value: formatAiStatus(task?.aiClassificationStatus),
            },
            {
              key: 'matched-pattern',
              label: 'Matched Rule',
              value: task?.matchedPattern || '-',
              xs: 12,
            },
            {
              key: 'ai-error',
              label: 'AI Error',
              value: task?.aiClassificationError || '-',
              hidden: !task?.aiClassificationError,
              xs: 12,
            },
          ]}
        />
      </div>
      {!isStaffScope ? (
        <>
          <WeeklyUpdateModal
            visible={weeklyUpdateVisible}
            task={task}
            onClose={() => setWeeklyUpdateVisible(false)}
            onSaved={refreshAfterWeeklyActivity}
          />
          <CarryForwardModal
            visible={carryForwardVisible}
            task={task}
            onClose={() => setCarryForwardVisible(false)}
            onSaved={refreshAfterWeeklyActivity}
          />
        </>
      ) : null}
    </DataTableDetailShell>
  )
}

export default TaskDetailPage
