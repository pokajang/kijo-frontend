// src/components/tasks/actionHandlers.js
import React from 'react'
import { DataTableStatusBadge } from '../../components/datatable'

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// — Create a fresh task —
export const createNewTask = (title, dueDate, todayStr) => ({
  id: Date.now(),
  title: title.trim(),
  dueDate: formatDateLocal(dueDate),
  status: 'Ongoing',
  createdAt: todayStr,
  completedAt: '',
  commentLogs: [],
})

// — Mark completed (stamps completedAt to today) —
export const markTaskCompleted = (tasks, id) =>
  tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          status: 'Completed',
          completedAt: formatDateLocal(new Date()),
        }
      : task,
  )

// — Add a comment entry to that task —
export const addTaskComment = (tasks, id, text) => {
  const timestamp = new Date().toISOString()
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          commentLogs: [...(task.commentLogs || []), { timestamp, text }],
        }
      : task,
  )
}

// — Only allow delete on truly “Ongoing” tasks —
export const deleteTask = (tasks, id, todayStr) => {
  const task = tasks.find((t) => t.id === id)
  // if it’s not an ongoing task (i.e. overdue or any kind of completed), don’t delete
  if (task && getStatusText(task, todayStr) !== 'Ongoing') {
    return tasks
  }
  return tasks.filter((t) => t.id !== id)
}

// — Utility: is still past-due & not completed? —
// add at top
const GRACE_DAYS = 1

const parseDateOnly = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
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

export const isOverdue = (task, todayStr) => {
  if (task.status === 'Completed') return false
  const due = parseDateOnly(task.dueDate)
  const today = parseDateOnly(todayStr)
  if (!due || !today) return false
  // push the cutoff out by GRACE_DAYS
  due.setDate(due.getDate() + GRACE_DAYS)
  // only after that extended date do we call it overdue
  return today > due
}

// — Utility: days between two YYYY-MM-DD dates, rounded up —
const daysBetween = (startStr, endStr) => {
  const start = parseDateOnly(startStr)
  const end = parseDateOnly(endStr)
  if (!start || !end) return null
  const ms = end - start
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const daysAfterGrace = (startStr, endStr) => {
  const days = daysBetween(startStr, endStr)
  return days == null ? null : Math.max(0, days - GRACE_DAYS)
}

// — Compute the human status label —
export const getStatusText = (task, todayStr) => {
  if (task.status === 'Completed') {
    // completedAt is a YYYY-MM-DD string
    const comp = task.completedAt
    if (!comp) return 'Completed'
    const late = daysAfterGrace(task.dueDate, comp)
    if (late == null) return 'Completed'
    return late > 0
      ? `Completed (Late by ${late} day${late > 1 ? 's' : ''})`
      : 'Completed (On time)'
  }
  if (isOverdue(task, todayStr)) {
    return 'Overdue'
  }
  return 'Ongoing'
}

// — JSX badges for each status —
export const getStatusBadge = (task, todayStr) => {
  const txt = getStatusText(task, todayStr)
  switch (true) {
    case txt.startsWith('Completed'):
      // show the full “Completed (On time)” or “Completed (Late by X…)”
      return <DataTableStatusBadge tone="success">{txt}</DataTableStatusBadge>
    case txt === 'Overdue':
      return <DataTableStatusBadge tone="danger">Overdue</DataTableStatusBadge>
    default:
      return <DataTableStatusBadge tone="info">Ongoing</DataTableStatusBadge>
  }
}

// — Sorting priority: Overdue → Ongoing → Completed on-time → Completed late —
const statusOrder = {
  Overdue: 1,
  Ongoing: 2,
  Completed: 3,
  'Completed (On time)': 3,
  'Completed (Late': 4,
}

export const sortTasks = (tasks, todayStr) =>
  [...tasks].sort((a, b) => {
    const sa = getStatusText(a, todayStr).split(' by')[0]
    const sb = getStatusText(b, todayStr).split(' by')[0]
    return (statusOrder[sa] || 99) - (statusOrder[sb] || 99)
  })

// — Days lapsed from dueDate until completion or today —
export const calculateDaysLapsed = (dueDate, todayStr, completedAt) => {
  const end = completedAt || todayStr
  const days = daysAfterGrace(dueDate, end)
  return days != null && days >= 0 ? `${days}` : '0'
}

export const getDaysLapsedInfo = (task, todayStr) => {
  const isCompleted = task?.status === 'Completed'
  const dueDate = task?.dueDate
  const endDate = isCompleted ? task?.completedAt : todayStr

  if (!dueDate || !endDate) {
    return {
      value: null,
      display: '-',
      basis: isCompleted ? 'Completion date missing' : 'Due date missing',
    }
  }

  const days = daysAfterGrace(dueDate, endDate)
  if (days == null) {
    return { value: null, display: '-', basis: 'Invalid date' }
  }

  const value = Math.max(0, days)
  if (!isCompleted && !isOverdue(task, todayStr)) {
    return {
      value: 0,
      display: '0',
      basis: 'Not overdue',
    }
  }

  if (isCompleted && value > 0) {
    return {
      value,
      display: `${value} day${value === 1 ? '' : 's'} until completion`,
      basis: 'Until completion',
    }
  }

  if (!isCompleted && value > 0) {
    return {
      value,
      display: `${value} day${value === 1 ? '' : 's'}`,
      basis: 'Running',
    }
  }

  return {
    value,
    display: '0',
    basis: isCompleted ? 'Completed on time' : 'Not overdue',
  }
}
