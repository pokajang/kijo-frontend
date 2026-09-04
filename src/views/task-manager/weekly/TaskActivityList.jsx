import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CListGroup, CListGroupItem, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCheckCircle, cilPlus, cilWarning } from '@coreui/icons'
import { listTaskUpdates } from './taskUpdateApi'
import { formatDisplayDate, formatWeekLabel } from './taskWeekUtils'

const updatePresentation = {
  progress: { label: 'Progress', color: 'success', icon: cilCheckCircle },
  hiccup: { label: 'Hiccup', color: 'warning', icon: cilWarning },
  carry_forward: { label: 'Carried forward', color: 'primary', icon: cilArrowRight },
  created: { label: 'Created', color: 'secondary', icon: cilPlus },
  completed: { label: 'Completed', color: 'success', icon: cilCheckCircle },
}

const createdEvent = (task) => ({
  id: 'created',
  type: 'created',
  createdAt: task?.createdAt,
  text: 'Task created.',
})

const completedEvent = (task) =>
  task?.completedAt
    ? {
        id: 'completed',
        type: 'completed',
        createdAt: task.completedAt,
        text: 'Task completed.',
      }
    : null

const TaskActivityList = ({ task, showActor = false, refreshToken = 0 }) => {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!task?.id) {
      setUpdates([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError('')
    listTaskUpdates(task.id)
      .then((data) => {
        if (!active) return
        if (data.status !== 'success')
          throw new Error(data.message || 'Unable to load activity history.')
        setUpdates(Array.isArray(data.updates) ? data.updates : [])
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load activity history.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshToken, task?.id])

  const events = useMemo(() => {
    const rows = [createdEvent(task), ...updates, completedEvent(task)].filter(Boolean)
    return rows.sort((left, right) => {
      const rightDate = right.reportedOn || right.createdAt || ''
      const leftDate = left.reportedOn || left.createdAt || ''
      return String(rightDate).localeCompare(String(leftDate))
    })
  }, [task, updates])

  if (loading) {
    return (
      <div className="small text-body-secondary d-flex align-items-center gap-2 py-2">
        <CSpinner size="sm" /> Loading activity history…
      </div>
    )
  }

  if (error)
    return (
      <CAlert color="warning" className="mb-0">
        {error}
      </CAlert>
    )

  return (
    <CListGroup flush className="border rounded overflow-hidden" aria-label="Task activity history">
      {events.map((event) => {
        const presentation = updatePresentation[event.type] || updatePresentation.progress
        const carryForwardText =
          event.type === 'carry_forward'
            ? `Due date changed from ${formatDisplayDate(event.previousDueDate)} to ${formatDisplayDate(event.newDueDate)}.`
            : event.note || event.text
        const activityDate = event.reportedOn || event.createdAt
        const actor = [event.createdByCode, event.createdByName].filter(Boolean).join(' - ')

        return (
          <CListGroupItem
            key={event.id || `${event.type}-${event.createdAt}`}
            className="px-3 py-3"
          >
            <div className="d-flex align-items-start gap-2">
              <CIcon
                icon={presentation.icon}
                className={`text-${presentation.color} mt-1 flex-shrink-0`}
              />
              <div className="min-w-0 flex-grow-1">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <CBadge color={presentation.color}>{presentation.label}</CBadge>
                  <span className="small text-body-secondary">
                    {formatDisplayDate(activityDate, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {event.reportingWeekStart ? (
                  <div className="small text-body-secondary mt-1">
                    Week of {formatWeekLabel(event.reportingWeekStart)}
                  </div>
                ) : null}
                <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                  {carryForwardText}
                </div>
                {showActor && event.createdBy ? (
                  <div className="small text-body-secondary mt-1">
                    Recorded by {actor || `staff #${event.createdBy}`}
                  </div>
                ) : null}
              </div>
            </div>
          </CListGroupItem>
        )
      })}
    </CListGroup>
  )
}

export default TaskActivityList
