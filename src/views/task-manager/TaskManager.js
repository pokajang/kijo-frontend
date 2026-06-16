// src/components/tasks/TaskManager.js
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CRow, CCol, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import CreateTask from './CreateTask'
import TaskTable from './TaskTable'
import * as handlers from './actionHandlers'
import dialog from '../../components/dialog/dialogService'
import { stripExactProjectMention } from '../../utils/projectMentionText'
import { listActiveProjectOptions } from '../project/manage/projectApi'
import { getPeriodDateParams, getPeriodRangePreset } from '../../components/filters'
import { appendQueryParams } from '../../utils/detailPages'
import {
  defaultTaskPreview,
  normalizeTaskClassification,
  previewTaskClassification,
} from './taskApi'
import { showToast } from '../../components/toast/toastService'

const TASK_DRAFT_STORAGE_KEY = 'task-manager.create-task-drafts.v3'
const AI_CLASSIFICATION_POLL_INTERVAL_MS = 4000
const AI_CLASSIFICATION_POLL_TIMEOUT_MS = 30000

export const buildPersonalTasksUrl = (apiBase, periodRange) =>
  appendQueryParams(`${apiBase}tasks/personal`, {
    ...getPeriodDateParams(periodRange),
  })

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isDateOnlyValue = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

const getPendingAiClassificationIds = (tasks = []) =>
  tasks
    .filter((task) => task?.aiClassificationStatus === 'pending')
    .map((task) => String(task.id || ''))
    .filter(Boolean)

const firstErrorMessage = (errors) => {
  if (!errors || typeof errors !== 'object') return ''

  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && value.length > 0) return String(value[0] || '')
    if (typeof value === 'string' && value.trim()) return value
  }

  return ''
}

const normalizeProjectOption = (project = {}) => {
  const value = String(
    project.id ?? project.value ?? project.projectId ?? project.project_id ?? '',
  ).trim()
  const label = String(project.projectName ?? project.project_name ?? project.label ?? '').trim()
  const clientName = String(project.clientName ?? project.client_name ?? '').trim()
  const projectType = String(project.projectType ?? project.project_type ?? '').trim()
  const startDate = String(
    project.startDate ?? project.start_date ?? project.service_start_date ?? '',
  ).trim()
  const endDate = String(
    project.endDate ?? project.end_date ?? project.service_end_date ?? '',
  ).trim()
  const status = String(project.status ?? '').trim()

  if (!value || !label) return null

  return {
    value,
    label,
    clientName,
    projectType,
    startDate,
    endDate,
    status,
  }
}

const TaskManager = () => {
  const todayStr = formatDateLocal(new Date())
  const createTaskDraft = () => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: '',
    dueDate: todayStr,
    projectId: '',
    projectLabel: '',
    projectClientName: '',
    ...defaultTaskPreview(),
  })
  const normalizeTaskDrafts = (drafts) => {
    if (!Array.isArray(drafts)) return [createTaskDraft()]
    const normalized = drafts
      .map((task) => {
        const title = String(task?.title || '')
        return {
          id: String(task?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
          title,
          dueDate: isDateOnlyValue(task?.dueDate ?? task?.due_date)
            ? String(task?.dueDate ?? task?.due_date)
            : todayStr,
          projectId: String(task?.projectId || task?.project_id || ''),
          projectLabel: String(task?.projectLabel || task?.project_label || ''),
          projectClientName: String(task?.projectClientName || task?.project_client_name || ''),
          ...defaultTaskPreview(title.trim() ? 'pending' : 'idle'),
        }
      })
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
  const [projectOptions, setProjectOptions] = useState([])
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [savingTasks, setSavingTasks] = useState(false)
  const aiClassificationPollRef = useRef(null)
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

  const savedDraftTitle = useCallback(
    (task) => {
      const selectedProject = projectOptions.find(
        (project) => String(project.value) === String(task.projectId || ''),
      )

      return stripExactProjectMention(task.title, selectedProject?.label || task.projectLabel)
    },
    [projectOptions],
  )

  const draftClassificationStatus = (task) => {
    const savedTitle = savedDraftTitle(task)

    return savedTitle.trim() ? defaultTaskPreview('pending') : defaultTaskPreview()
  }

  useEffect(() => {
    const controllers = []
    const timers = []

    taskDrafts.forEach((task) => {
      if (task.classificationStatus !== 'pending') return

      const savedTitle = savedDraftTitle(task).trim()
      if (!savedTitle) {
        setTaskDrafts((prev) =>
          prev.map((current) =>
            current.id === task.id ? { ...current, ...defaultTaskPreview() } : current,
          ),
        )
        return
      }

      const controller = new AbortController()
      controllers.push(controller)
      const timer = window.setTimeout(() => {
        previewTaskClassification(savedTitle, { signal: controller.signal })
          .then((classification) => {
            setTaskDrafts((prev) =>
              prev.map((current) => {
                if (current.id !== task.id) return current
                if (savedDraftTitle(current).trim() !== savedTitle) return current

                return {
                  ...current,
                  ...normalizeTaskClassification(classification, 'resolved'),
                }
              }),
            )
          })
          .catch((error) => {
            if (controller.signal.aborted || error?.name === 'AbortError') return
            setTaskDrafts((prev) =>
              prev.map((current) => {
                if (current.id !== task.id) return current
                if (savedDraftTitle(current).trim() !== savedTitle) return current

                return {
                  ...current,
                  ...defaultTaskPreview('error'),
                }
              }),
            )
          })
      }, 600)

      timers.push(timer)
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      controllers.forEach((controller) => controller.abort())
    }
  }, [savedDraftTitle, taskDrafts])

  const onDraftChange = (id, field, value) => {
    setTaskDrafts((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task

        const nextTask = { ...task, [field]: value }
        if (field === 'projectId') {
          const selectedProject = projectOptions.find(
            (project) => String(project.value) === String(value || ''),
          )
          nextTask.projectLabel = value ? selectedProject?.label || nextTask.projectLabel || '' : ''
          nextTask.projectClientName = value
            ? selectedProject?.clientName || nextTask.projectClientName || ''
            : ''
        }
        if (field === 'title' || field === 'projectId') {
          return {
            ...nextTask,
            ...draftClassificationStatus(nextTask),
          }
        }

        return nextTask
      }),
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
      const res = await fetch(buildPersonalTasksUrl(import.meta.env.VITE_API_BASE, periodRange), {
        credentials: 'include',
      })
      const json = await res.json()
      if (json.status === 'success') {
        const tasks = Array.isArray(json.tasks) ? json.tasks : []
        setTaskList(tasks)
        return tasks
      } else {
        console.error('Failed to load tasks:', json.message)
      }
    } catch (err) {
      console.error('Network error loading tasks', err)
    }
    return null
  }, [periodRange])

  const clearAiClassificationPolling = useCallback(() => {
    if (aiClassificationPollRef.current) {
      clearTimeout(aiClassificationPollRef.current)
      aiClassificationPollRef.current = null
    }
  }, [])

  const startAiClassificationPolling = useCallback(
    (taskIds = []) => {
      const pendingIds = new Set(taskIds.map((id) => String(id || '')).filter(Boolean))
      if (!pendingIds.size) return

      clearAiClassificationPolling()
      const expiresAt = Date.now() + AI_CLASSIFICATION_POLL_TIMEOUT_MS

      const poll = async () => {
        const tasks = await loadTasks()
        if (Array.isArray(tasks)) {
          tasks.forEach((task) => {
            const id = String(task?.id || '')
            if (pendingIds.has(id) && task?.aiClassificationStatus !== 'pending') {
              pendingIds.delete(id)
            }
          })
        }

        if (!pendingIds.size || Date.now() >= expiresAt) {
          aiClassificationPollRef.current = null
          return
        }

        aiClassificationPollRef.current = setTimeout(poll, AI_CLASSIFICATION_POLL_INTERVAL_MS)
      }

      aiClassificationPollRef.current = setTimeout(poll, AI_CLASSIFICATION_POLL_INTERVAL_MS)
    },
    [clearAiClassificationPolling, loadTasks],
  )

  // load on mount
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => clearAiClassificationPolling, [clearAiClassificationPolling])

  useEffect(() => {
    let active = true

    listActiveProjectOptions()
      .then((projects) => {
        if (!active) return
        setProjectOptions(
          projects
            .map(normalizeProjectOption)
            .filter(Boolean)
            .sort(
              (a, b) =>
                a.label.localeCompare(b.label) ||
                a.clientName.localeCompare(b.clientName) ||
                a.value.localeCompare(b.value),
            ),
        )
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to load project options:', err)
        setProjectOptions([])
      })

    return () => {
      active = false
    }
  }, [])

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
      .map((task) => {
        const selectedProject = projectOptions.find(
          (project) => String(project.value) === String(task.projectId || ''),
        )

        const savedTitle = stripExactProjectMention(
          task.title,
          selectedProject?.label || task.projectLabel,
        )

        return {
          title: savedTitle,
          due_date: task.dueDate,
          project_id: task.projectId ? Number(task.projectId) : null,
        }
      })
      .filter((task) => task.title)

    if (tasksToSave.length === 0) return
    if (tasksToSave.some((task) => !isDateOnlyValue(task.due_date))) {
      dialog.alert('Please choose a valid due date for each task.')
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
        const createdTasks = Array.isArray(json.tasks) ? json.tasks : []
        const pendingAiTaskIds = getPendingAiClassificationIds(createdTasks)

        // reload the full list so filters & sorting reapply
        await loadTasks()
        if (pendingAiTaskIds.length > 0) {
          showToast('Task saved. AI classification is updating in the background.')
          startAiClassificationPolling(pendingAiTaskIds)
        }
        resetCreateTaskForm()
        setShowCreateTaskModal(false)
        clearCreateActionParam()
      } else {
        dialog.alert(firstErrorMessage(json.errors) || json.message || 'Failed to create task')
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
    if (
      !(await dialog.confirm('Are you sure you want to delete this task?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    ) {
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
            periodRange={periodRange}
            onPeriodRangeChange={setPeriodRange}
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
            projectOptions={projectOptions}
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
