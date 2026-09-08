import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CBadge,
  CButton,
  CButtonGroup,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import { formatDateOnly, formatDisplayDate } from './weekly/taskWeekUtils'

export const QUICK_UPDATE_DISMISSED_KEY = 'task-manager.quick-update.dismissed.v1'

const MAX_UPDATE_LENGTH = 1000
const updateTypes = [
  { value: 'progress', label: 'Progress' },
  { value: 'hiccup', label: 'Hiccup' },
  { value: 'complete', label: 'Complete' },
]

const readDismissedTaskIds = () => {
  if (typeof window === 'undefined') return []

  try {
    const value = JSON.parse(window.localStorage.getItem(QUICK_UPDATE_DISMISSED_KEY) || '[]')
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

const isOpenTask = (task) =>
  String(task?.status || '')
    .trim()
    .toLowerCase() === 'ongoing'

const compareOpenTasks = (left, right) => {
  const leftDue = String(left?.dueDate || '9999-12-31').slice(0, 10)
  const rightDue = String(right?.dueDate || '9999-12-31').slice(0, 10)
  if (leftDue !== rightDue) return leftDue.localeCompare(rightDue)

  const leftCreated = String(left?.createdAt || '')
  const rightCreated = String(right?.createdAt || '')
  return leftCreated.localeCompare(rightCreated)
}

const QuickTaskUpdateList = ({ tasks = [], onSaveUpdate, onCompleteTask }) => {
  const editorRef = useRef(null)
  const [dismissedTaskIds, setDismissedTaskIds] = useState(readDismissedTaskIds)
  const [activeTaskId, setActiveTaskId] = useState('')
  const [updateType, setUpdateType] = useState('progress')
  const [updateDate, setUpdateDate] = useState(formatDateOnly(new Date()))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastDismissedTask, setLastDismissedTask] = useState(null)

  const visibleTasks = useMemo(() => {
    const dismissed = new Set(dismissedTaskIds)
    return tasks
      .filter((task) => isOpenTask(task) && !dismissed.has(String(task.id)))
      .sort(compareOpenTasks)
  }, [dismissedTaskIds, tasks])

  useEffect(() => {
    if (!activeTaskId) return
    editorRef.current?.focus()
  }, [activeTaskId, updateType])

  const resetEditor = () => {
    setActiveTaskId('')
    setUpdateType('progress')
    setUpdateDate(formatDateOnly(new Date()))
    setNote('')
    setError('')
  }

  const dismissTask = (task, undoable = true) => {
    const taskId = task?.id ?? task
    const id = String(taskId)
    setDismissedTaskIds((current) => {
      const next = [...new Set([...current, id])]
      try {
        window.localStorage.setItem(QUICK_UPDATE_DISMISSED_KEY, JSON.stringify(next))
      } catch {
        // Keep the dismissal for this session if local storage is unavailable.
      }
      return next
    })
    setLastDismissedTask(undoable ? task : null)
    if (activeTaskId === id) resetEditor()
  }

  const undoDismiss = () => {
    if (!lastDismissedTask) return
    const id = String(lastDismissedTask.id)
    setDismissedTaskIds((current) => {
      const next = current.filter((taskId) => taskId !== id)
      try {
        window.localStorage.setItem(QUICK_UPDATE_DISMISSED_KEY, JSON.stringify(next))
      } catch {
        // Keep the restored task visible for this session if local storage is unavailable.
      }
      return next
    })
    setLastDismissedTask(null)
  }

  const openEditor = (taskId) => {
    const id = String(taskId)
    if (activeTaskId === id) {
      resetEditor()
      return
    }

    setActiveTaskId(id)
    setUpdateType('progress')
    setUpdateDate(formatDateOnly(new Date()))
    setNote('')
    setError('')
  }

  const save = async (task) => {
    const trimmedNote = note.trim()
    if (updateType !== 'complete' && !trimmedNote) {
      setError('Add a short update before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (updateType === 'complete') {
        await onCompleteTask?.(task.id, updateDate)
      } else {
        await onSaveUpdate?.(task.id, {
          update_type: updateType,
          reporting_date: updateDate,
          note: trimmedNote,
        })
      }
      dismissTask(task, false)
    } catch (err) {
      setError(err?.message || 'Unable to update this task. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="create-task-quick-update mt-4" aria-labelledby="quick-task-update-title">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h2 id="quick-task-update-title" className="h6 mb-0">
          Quick update
        </h2>
        <CBadge color="secondary">{visibleTasks.length}</CBadge>
        <span className="small text-body-secondary">Open tasks</span>
      </div>

      {lastDismissedTask ? (
        <div className="create-task-quick-update__undo small" role="status">
          <span>Task removed from Quick Update.</span>
          <CButton color="link" size="sm" className="p-0" onClick={undoDismiss}>
            Undo
          </CButton>
        </div>
      ) : null}

      {visibleTasks.length === 0 ? (
        <div className="create-task-quick-update__empty text-body-secondary small">
          No open tasks available for a quick update.
        </div>
      ) : (
        <div className="create-task-quick-update__list">
          {visibleTasks.map((task) => {
            const taskId = String(task.id)
            const isActive = activeTaskId === taskId
            const editorId = `quick-task-update-${taskId}`

            return (
              <article key={taskId} className="create-task-quick-update__item">
                <div className="create-task-quick-update__summary">
                  <div className="min-w-0">
                    <div className="fw-semibold text-break">{task.title || 'Untitled task'}</div>
                    <div className="small text-body-secondary mt-1">
                      Due {formatDisplayDate(task.dueDate)}
                    </div>
                    {task.projectName ? (
                      <div className="small text-body-secondary text-break">{task.projectName}</div>
                    ) : null}
                  </div>
                  <div className="create-task-quick-update__actions">
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="outline"
                      aria-expanded={isActive}
                      aria-controls={editorId}
                      disabled={saving}
                      onClick={() => openEditor(task.id)}
                    >
                      {isActive ? 'Close' : 'Update'}
                    </CButton>
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="ghost"
                      aria-label={`Dismiss ${task.title || 'task'} from quick updates`}
                      title="Dismiss from quick updates"
                      disabled={saving}
                      onClick={() => dismissTask(task)}
                    >
                      <CIcon icon={cilX} />
                    </CButton>
                  </div>
                </div>

                {isActive ? (
                  <div id={editorId} className="create-task-quick-update__editor">
                    <CButtonGroup
                      size="sm"
                      className="w-100 mb-2"
                      aria-label={`Update type for ${task.title || 'task'}`}
                    >
                      {updateTypes.map((type) => (
                        <CButton
                          key={type.value}
                          color={updateType === type.value ? 'primary' : 'secondary'}
                          variant={updateType === type.value ? undefined : 'outline'}
                          aria-pressed={updateType === type.value}
                          disabled={saving}
                          onClick={() => {
                            setUpdateType(type.value)
                            setError('')
                          }}
                        >
                          {type.label}
                        </CButton>
                      ))}
                    </CButtonGroup>

                    <div className="create-task-quick-update__fields">
                      <div>
                        <CFormLabel htmlFor={`${editorId}-date`}>
                          {updateType === 'complete' ? 'Completion date' : 'Reporting date'}
                        </CFormLabel>
                        <CFormInput
                          id={`${editorId}-date`}
                          ref={updateType === 'complete' ? editorRef : undefined}
                          type="date"
                          min={String(task.createdAt || '').slice(0, 10) || undefined}
                          max={formatDateOnly(new Date())}
                          value={updateDate}
                          disabled={saving}
                          onChange={(event) => setUpdateDate(event.target.value)}
                        />
                      </div>

                      {updateType === 'complete' ? null : (
                        <div className="min-w-0">
                          <CFormLabel htmlFor={`${editorId}-note`}>
                            {updateType === 'hiccup' ? 'Hiccup' : 'Update'}
                          </CFormLabel>
                          <CFormTextarea
                            id={`${editorId}-note`}
                            ref={editorRef}
                            rows={2}
                            maxLength={MAX_UPDATE_LENGTH}
                            value={note}
                            disabled={saving}
                            placeholder={
                              updateType === 'hiccup'
                                ? 'What is blocking or slowing this task?'
                                : 'What changed or moved forward?'
                            }
                            onChange={(event) => setNote(event.target.value)}
                          />
                        </div>
                      )}

                      <div className="create-task-quick-update__submit">
                        <CButton
                          color={updateType === 'hiccup' ? 'warning' : 'primary'}
                          size="sm"
                          disabled={saving || !updateDate}
                          onClick={() => void save(task)}
                        >
                          {saving ? (
                            <>
                              <CSpinner size="sm" className="me-1" /> Saving
                            </>
                          ) : updateType === 'complete' ? (
                            'Complete task'
                          ) : updateType === 'hiccup' ? (
                            'Report hiccup'
                          ) : (
                            'Save update'
                          )}
                        </CButton>
                      </div>
                    </div>

                    {error ? (
                      <div className="small text-danger mt-2" role="alert">
                        {error}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default QuickTaskUpdateList
