import { appendQueryParams, fetchJson } from '../../../utils/detailPages'

const API_BASE = import.meta.env.VITE_API_BASE

export const listTaskUpdates = (taskId) =>
  fetchJson(`${API_BASE}tasks/${encodeURIComponent(taskId)}/updates`)

export const createTaskUpdate = (taskId, payload) =>
  fetchJson(`${API_BASE}tasks/${encodeURIComponent(taskId)}/updates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const carryTaskForward = (taskId, newDueDate) =>
  fetchJson(`${API_BASE}tasks/${encodeURIComponent(taskId)}/carry-forward`, {
    method: 'PATCH',
    body: JSON.stringify({ new_due_date: newDueDate }),
  })

export const getWeeklySummary = ({ weekStart, staffId } = {}) =>
  fetchJson(
    appendQueryParams(`${API_BASE}tasks/weekly-summary`, {
      week_start: weekStart,
      staff_id: staffId && staffId !== 'all' ? staffId : '',
    }),
  )

export const getWeeklyStaffOptions = () =>
  fetchJson(`${API_BASE}tasks/weekly-summary/staff-options`)
