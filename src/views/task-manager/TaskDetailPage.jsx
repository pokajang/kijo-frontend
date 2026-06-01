import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailFields, DataTableDetailShell } from '../../components/datatable'
import dialog from '../../components/dialog/dialogService'
import { fetchJson, findRecordById } from '../../utils/detailPages'
import { getDaysLapsedInfo, getStatusText } from './actionHandlers'

const API_BASE = import.meta.env.VITE_API_BASE

const formatCommentLogs = (logs = []) =>
  logs.length
    ? logs
        .map((log) => `${log.text || '-'} (${new Date(log.timestamp).toLocaleString()})`)
        .join('\n')
    : '-'

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
  const returnTo = location.state?.returnTo || (isStaffScope ? '/staff/tasks' : '/task-manager')
  const [task, setTask] = useState(() => normalizeTask(location.state?.record, todayStr))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')

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

  const actions = useMemo(() => {
    if (isStaffScope || !task || task.statusText.startsWith('Completed')) return []
    return [
      { key: 'add-comment', label: 'Add Comment', onClick: addComment },
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
    </DataTableDetailShell>
  )
}

export default TaskDetailPage
