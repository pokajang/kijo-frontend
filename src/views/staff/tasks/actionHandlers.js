import React from 'react'
import { DataTableStatusBadge } from '../../../components/datatable'

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
  return today > due
}

const daysBetween = (startStr, endStr) => {
  const start = parseDateOnly(startStr)
  const end = parseDateOnly(endStr)
  if (!start || !end) return null
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

const formatDayCount = (days) => `${days} day${days === 1 ? '' : 's'}`

export const getStatusText = (task, todayStr) => {
  if (task.status === 'Completed') {
    const completedAt = task.completedAt
    if (!completedAt) return 'Completed'
    const lateDays = daysBetween(task.dueDate, completedAt)
    if (lateDays == null) return 'Completed'
    return lateDays > 0
      ? `Completed but late by ${formatDayCount(lateDays)}`
      : 'Completed (On time)'
  }

  if (isOverdue(task, todayStr)) {
    const overdueDays = daysBetween(task.dueDate, todayStr)
    return overdueDays && overdueDays > 0 ? `Overdue by ${formatDayCount(overdueDays)}` : 'Overdue'
  }

  return 'Ongoing'
}

export const getStatusBadge = (task, todayStr) => {
  const text = getStatusText(task, todayStr)
  if (text.startsWith('Completed')) {
    return (
      <DataTableStatusBadge tone="success" className="text-wrap text-start">
        {text}
      </DataTableStatusBadge>
    )
  }
  if (text.startsWith('Overdue')) {
    return (
      <DataTableStatusBadge tone="danger" className="text-wrap text-start">
        {text}
      </DataTableStatusBadge>
    )
  }
  return <DataTableStatusBadge tone="info">Ongoing</DataTableStatusBadge>
}

const statusOrder = {
  Overdue: 1,
  Ongoing: 2,
  Completed: 3,
  'Completed (On time)': 3,
  'Completed but late': 4,
}

export const sortTasks = (tasks, todayStr) =>
  [...tasks].sort((a, b) => {
    const leftStatus = getStatusText(a, todayStr).replace(/ by .*$/, '')
    const rightStatus = getStatusText(b, todayStr).replace(/ by .*$/, '')
    return (statusOrder[leftStatus] || 99) - (statusOrder[rightStatus] || 99)
  })

export const calculateDaysLapsed = (createdAt, todayStr, completedAt) => {
  const endDate = completedAt || todayStr
  const days = daysBetween(createdAt, endDate)
  return days != null && days >= 0 ? `${days}` : '0'
}

export const getDaysLapsedInfo = (task, todayStr) => {
  const isCompleted = task?.status === 'Completed'
  const createdAt = task?.createdAt || task?.created_at
  const endDate = isCompleted ? task?.completedAt || task?.completed_at : todayStr

  if (!createdAt || !endDate) {
    return {
      value: null,
      display: '-',
      basis: isCompleted ? 'Completion date missing' : 'Creation date missing',
    }
  }

  const days = daysBetween(createdAt, endDate)
  if (days == null) {
    return { value: null, display: '-', basis: 'Invalid date' }
  }

  const value = Math.max(0, days)
  if (value > 0) {
    return {
      value,
      display: formatDayCount(value),
      basis: isCompleted ? 'Completion duration' : 'Open duration',
    }
  }

  return {
    value,
    display: '0',
    basis: isCompleted ? 'Completed same day' : 'Created today',
  }
}
