// src/components/tasks/actionHandlers.js

import React from 'react'
import { DataTableStatusBadge } from '../../../components/datatable'

// Number of grace days before marking overdue
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

/**
 * Check if a task is overdue (with GRACE_DAYS forgiveness)
 */
export const isOverdue = (task, todayStr) => {
  if (task.status === 'Completed') return false
  const due = parseDateOnly(task.dueDate)
  const today = parseDateOnly(todayStr)
  if (!due || !today) return false
  due.setDate(due.getDate() + GRACE_DAYS)
  return today > due
}

/**
 * Compute days between two YYYY-MM-DD dates, rounded up
 */
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

/**
 * Return human-readable status text:
 * - Completed (On time) or Completed (Late by X days)
 * - Overdue
 * - Ongoing
 */
export const getStatusText = (task, todayStr) => {
  if (task.status === 'Completed') {
    const comp = task.completedAt
    if (!comp) return 'Completed'
    const lateDays = daysAfterGrace(task.dueDate, comp)
    if (lateDays == null) return 'Completed'
    return lateDays > 0
      ? `Completed (Late by ${lateDays} day${lateDays > 1 ? 's' : ''})`
      : 'Completed (On time)'
  }
  if (isOverdue(task, todayStr)) {
    return 'Overdue'
  }
  return 'Ongoing'
}

/**
 * Return a JSX badge for each status
 */
export const getStatusBadge = (task, todayStr) => {
  const txt = getStatusText(task, todayStr)
  if (txt.startsWith('Completed')) {
    return <DataTableStatusBadge tone="success">{txt}</DataTableStatusBadge>
  }
  if (txt === 'Overdue') {
    return <DataTableStatusBadge tone="danger">Overdue</DataTableStatusBadge>
  }
  return <DataTableStatusBadge tone="info">Ongoing</DataTableStatusBadge>
}

/**
 * Sorting order for statuses:
 * Overdue → Ongoing → Completed (On time) → Completed (Late…)
 */
const statusOrder = {
  Overdue: 1,
  Ongoing: 2,
  Completed: 3,
  'Completed (On time)': 3,
  'Completed (Late': 4, // partial key to catch late
}

/**
 * Sort tasks by status priority
 */
export const sortTasks = (tasks, todayStr) =>
  [...tasks].sort((a, b) => {
    const sa = getStatusText(a, todayStr).split(' by')[0]
    const sb = getStatusText(b, todayStr).split(' by')[0]
    return (statusOrder[sa] || 99) - (statusOrder[sb] || 99)
  })

/**
 * Calculate days lapsed from dueDate until completion or today
 */
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
