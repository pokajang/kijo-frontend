// src/views/feedback/actionHandlers.js

import { fetchAllPagedRecords } from '../../utils/detailPages'

const API_BASE = import.meta.env.VITE_API_BASE

const getSessionInfoFromUser = (user) => {
  const rawStaffId = Number(user?.staff_id)
  return {
    isAdmin: Array.isArray(user?.roles) && user.roles.includes('System Admin'),
    staffId: Number.isFinite(rawStaffId) ? rawStaffId : null,
  }
}

/**
 * Fetch session info to determine if current user is a System Admin.
 * @returns {Promise<{ isAdmin: boolean, staffId: number | null }>}
 */
export async function fetchSessionInfo(sessionUser = null) {
  if (sessionUser) {
    return getSessionInfoFromUser(sessionUser)
  }

  const res = await fetch(`${API_BASE}auth/session`, {
    credentials: 'include',
  })
  const data = await res.json()
  return getSessionInfoFromUser(data.user)
}

/**
 * Fetch all feedback records.
 * @returns {Promise<Array>}
 */
export async function fetchAllFeedbacks() {
  return fetchAllPagedRecords({
    url: `${API_BASE}feedback`,
    params: { year: new Date().getFullYear() },
    dataKeys: ['feedbacks', 'data'],
    perPage: 100,
  })
}

/**
 * Fetch monthly feedback SLA metrics.
 * @param {number} year
 * @returns {Promise<Object>} API response
 */
export async function fetchMonthlyFeedbackSla(year = new Date().getFullYear(), signal = undefined) {
  const params = new URLSearchParams({ year: String(year) })
  const res = await fetch(`${API_BASE}feedback/metrics/monthly?${params.toString()}`, {
    credentials: 'include',
    signal,
  })
  return await res.json()
}

/**
 * Submit a new feedback entry.
 * @param {string} feedbackText
 * @returns {Promise<Object>} API response
 */
export async function submitFeedback(feedbackText) {
  const res = await fetch(`${API_BASE}feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ feedback: feedbackText }),
  })
  return await res.json()
}

/**
 * Update an existing feedback.
 * - System Admin: may update status/action_date/remarks and feedback.
 * - Owner: may update feedback text only.
 * @param {Object} feedbackData
 * @returns {Promise<Object>} API response
 */
export async function updateFeedback(feedbackData) {
  const feedbackId = feedbackData?.id ?? feedbackData?.feedback_id
  if (!feedbackId) {
    return { status: 'error', message: 'Missing feedback ID.' }
  }
  const payload = { ...feedbackData }
  delete payload.id
  delete payload.feedback_id

  const res = await fetch(`${API_BASE}feedback/${feedbackId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return await res.json()
}

/**
 * Delete a feedback record (owner or admin).
 * @param {number} id
 * @returns {Promise<Object>} API response
 */
export async function deleteFeedback(id) {
  const res = await fetch(`${API_BASE}feedback/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return await res.json()
}
