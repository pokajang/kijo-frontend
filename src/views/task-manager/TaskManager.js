// src/components/tasks/TaskManager.js
import React, { useState, useEffect, useCallback } from 'react'
import { CRow, CCol, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import CreateTask from './CreateTask'
import TaskTable from './TaskTable'
import * as handlers from './actionHandlers'
import dialog from '../../components/dialog/dialogService'

const TASK_DRAFT_STORAGE_KEY = 'task-manager.create-task-drafts.v1'

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const TaskManager = () => {
  const todayStr = formatDateLocal(new Date())
  const createTaskDraft = () => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: '',
    dueDate: todayStr,
  })
  const normalizeTaskDrafts = (drafts) => {
    if (!Array.isArray(drafts)) return [createTaskDraft()]
    const normalized = drafts
      .map((task) => ({
        id: String(task?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        title: String(task?.title || ''),
        dueDate: String(task?.dueDate || todayStr),
      }))
      .filter((task) => task.title.trim() || task.dueDate)

    return normalized.length ? normalized : [createTaskDraft()]
  }
  const readStoredTaskDrafts = () => {
    if (typeof window === 'undefined') return [createTaskDraft()]
    try {
      const raw = window.localStorage.getItem(TASK_DRAFT_STORAGE_KEY)
      return raw ? normalizeTaskDrafts(JSON.parse(raw)) : [createTaskDraft()]
    } catch {
      return [createTaskDraft()]
    }
  }
  const clearStoredTaskDrafts = () => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(TASK_DRAFT_STORAGE_KEY)
    } catch {
      // ignore storage failures
    }
  }
  const [taskDrafts, setTaskDrafts] = useState(readStoredTaskDrafts)
  const [taskList, setTaskList] = useState([])
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [savingTasks, setSavingTasks] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const resetCreateTaskForm = ({ clearStorage = true } = {}) => {
    if (clearStorage) clearStoredTaskDrafts()
    setTaskDrafts([createTaskDraft()])
  }

  const clearCreateActionParam = useCallback(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('action') !== 'create') return

    params.delete('action')
    const search = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
      },
      { replace: true },
    )
  }, [location.pathname, location.search, navigate])

  const closeCreateTaskModal = () => {
    if (savingTasks) return
    setShowCreateTaskModal(false)
    clearCreateActionParam()
  }

  const onDraftChange = (id, field, value) => {
    setTaskDrafts((prev) =>
      prev.map((task) => (task.id === id ? { ...task, [field]: value } : task)),
    )
  }

  const onAddDraft = () => {
    setTaskDrafts((prev) => [...prev, createTaskDraft()])
  }

  const onRemoveDraft = (id) => {
    setTaskDrafts((prev) => (prev.length > 1 ? prev.filter((task) => task.id !== id) : prev))
  }

  // — fetch & load all tasks for this staff —
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}tasks/personal?year=${String(todayStr).slice(0, 4)}`,
        {
          credentials: 'include',
        },
      )
      const json = await res.json()
      if (json.status === 'success') {
        setTaskList(json.tasks)
      } else {
        console.error('Failed to load tasks:', json.message)
      }
    } catch (err) {
      console.error('Network error loading tasks', err)
    }
  }, [todayStr])

  // load on mount
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('action') === 'create') {
      setShowCreateTaskModal(true)
    }
  }, [location.search])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasDraftContent =
      taskDrafts.length > 1 ||
      taskDrafts.some((task) => task.title.trim() || task.dueDate !== todayStr)

    try {
      if (hasDraftContent) {
        window.localStorage.setItem(TASK_DRAFT_STORAGE_KEY, JSON.stringify(taskDrafts))
      } else {
        window.localStorage.removeItem(TASK_DRAFT_STORAGE_KEY)
      }
    } catch {
      // ignore storage failures; the modal still works in memory
    }
  }, [taskDrafts, todayStr])

  // — create —
  const onSaveTasks = async () => {
    const tasksToSave = taskDrafts
      .map((task) => ({
        title: task.title.trim(),
        due_date: task.dueDate,
      }))
      .filter((task) => task.title)

    if (tasksToSave.length === 0) return
    if (tasksToSave.some((task) => !task.due_date)) {
      dialog.alert('Please choose a due date for each task.')
      return
    }

    setSavingTasks(true)
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE}tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tasks: tasksToSave }),
      })
      const json = await resp.json()
      if (json.status === 'success') {
        // reload the full list so filters & sorting reapply
        await loadTasks()
        resetCreateTaskForm()
        setShowCreateTaskModal(false)
        clearCreateActionParam()
      } else {
        dialog.alert(json.message || 'Failed to create task')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('Network error, try again')
    } finally {
      setSavingTasks(false)
    }
  }

  // Drop-in replacement for onMarkCompleted in TaskManager.js
  const onMarkCompleted = async (id) => {
    if (!(await dialog.confirm('Are you sure you want to mark this task as completed?'))) {
      return
    }
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE}tasks/${encodeURIComponent(id)}/complete`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: id }),
        },
      )
      const json = await resp.json()
      if (json.status === 'success') {
        // reload so the updated status shows up
        loadTasks()
      } else {
        dialog.alert(json.message || 'Failed to mark task completed')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('Network error, try again')
    }
  }

  // — add comment —
  const onAddComment = async (taskId) => {
    const text = await dialog.prompt('Enter comment:')
    if (!text) return

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE}tasks/${encodeURIComponent(taskId)}/comments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, text }),
        },
      )
      const json = await resp.json()
      if (json.status === 'success') {
        // append to that task's commentLogs in state
        setTaskList((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  commentLogs: [
                    ...task.commentLogs,
                    { text: json.comment.text, timestamp: json.comment.timestamp },
                  ],
                }
              : task,
          ),
        )
      } else {
        dialog.alert(json.message || 'Failed to add comment')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('Network error, try again')
    }
  }

  // — delete (with confirmation) —
  // Replace your existing onDeleteTask with this:
  const onDeleteTask = async (id) => {
    if (!(await dialog.confirm('Are you sure you want to delete this task?'))) {
      return
    }
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE}tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: id }),
      })
      const json = await resp.json()
      if (json.status === 'success') {
        // refresh the table
        loadTasks()
      } else {
        dialog.alert(json.message || 'Failed to delete task')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('Network error, try again')
    }
  }

  // — sort for display —
  const sortedTasks = handlers.sortTasks(taskList, todayStr)

  return (
    <>
      <CRow className="g-4">
        {/* Task table */}
        <CCol md={12}>
          <TaskTable
            tasks={sortedTasks}
            todayStr={todayStr}
            getStatusBadge={handlers.getStatusBadge}
            handleAddComment={onAddComment}
            handleMarkCompleted={onMarkCompleted}
            handleDeleteTask={onDeleteTask}
            onCreateTask={() => setShowCreateTaskModal(true)}
            onView={(task) =>
              navigate(`/task-manager/${task.id}`, {
                state: { record: task, returnTo: '/task-manager' },
              })
            }
          />
        </CCol>
      </CRow>

      <CModal
        visible={showCreateTaskModal}
        onClose={closeCreateTaskModal}
        alignment="center"
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Create Task</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CreateTask
            embedded
            taskDrafts={taskDrafts}
            onDraftChange={onDraftChange}
            onAddDraft={onAddDraft}
            onRemoveDraft={onRemoveDraft}
            onSaveTasks={onSaveTasks}
            onReset={resetCreateTaskForm}
            onCancel={closeCreateTaskModal}
            saving={savingTasks}
          />
        </CModalBody>
      </CModal>
    </>
  )
}

export default TaskManager
