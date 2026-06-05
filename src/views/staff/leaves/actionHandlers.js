// src/actionHandlers.js

import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'
import { getYearScopedParamSets, mergeUniqueRecordsById } from '../../../components/filters'
import { appendQueryParams } from '../../../utils/detailPages'

const API_BASE = `${import.meta.env.VITE_API_BASE}`.replace(/\/+$/, '')

const readJsonPayload = async (res) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const fetchLeaveJson = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const result = await readJsonPayload(res)

  if (!res.ok) {
    throw new Error(result?.message || `Request failed with HTTP ${res.status}`)
  }

  if (result?.status !== 'success') {
    throw new Error(result?.message || 'Request failed')
  }

  return result
}

// VIEW ALL LEAVES SECTION - 1ST SECTION
const normalizeLeavePayload = (result) => {
  const leaves = Array.isArray(result.leaves)
    ? result.leaves
    : Array.isArray(result.data)
      ? result.data
      : []

  const permissions = result.action_permissions || null

  return {
    leaves,
    actionPermissions: permissions
      ? {
          canRecommend: Boolean(permissions.can_recommend),
          canApprove: Boolean(permissions.can_approve),
        }
      : null,
  }
}

// fetch leaves data
export async function getAllLeavesPayload(periodRange) {
  const paramSets = getYearScopedParamSets(periodRange)
  const payloads = await Promise.all(
    paramSets.map(async (params) => {
      const result = await fetchLeaveJson(appendQueryParams(`${API_BASE}/hr/leaves`, params))
      return normalizeLeavePayload(result)
    }),
  )

  return {
    leaves: mergeUniqueRecordsById(payloads.flatMap((payload) => payload.leaves)),
    actionPermissions:
      payloads.find((payload) => payload.actionPermissions)?.actionPermissions || null,
  }
}

export async function getAllLeaves(periodRange) {
  const { leaves } = await getAllLeavesPayload(periodRange)
  return leaves
}

// workflow action: recommend, approve, reject, or revoke
export async function leaveAction(id, action, remarks) {
  const result = await fetchLeaveJson(`${API_BASE}/hr/leaves/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: JSON.stringify({ id, action, remarks }),
  })
  dispatchAppNotificationsChanged()
  return result
}

export async function cancelLeave(id) {
  const result = await fetchLeaveJson(`${API_BASE}/hr/leaves/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
  dispatchAppNotificationsChanged()
  return result
}

// LEAVE ENTITLEMENT SECTION
export async function getStaffList() {
  const result = await fetchLeaveJson(`${API_BASE}/staff/list`)
  return Array.isArray(result.staff) ? result.staff : Array.isArray(result.data) ? result.data : []
}

export async function getAllEntitlements() {
  const result = await fetchLeaveJson(`${API_BASE}/hr/leaves/entitlements`)
  return Array.isArray(result.allocations)
    ? result.allocations
    : Array.isArray(result.data)
      ? result.data
      : []
}

export async function getLeaveEntitlementHistory() {
  const result = await fetchLeaveJson(`${API_BASE}/hr/leaves/entitlements/history`)
  return Array.isArray(result.history)
    ? result.history
    : Array.isArray(result.data)
      ? result.data
      : []
}

export async function assignLeaveEntitlement(payload) {
  return fetchLeaveJson(`${API_BASE}/hr/leaves/entitlements`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteEntitlement(id) {
  return fetchLeaveJson(`${API_BASE}/hr/leaves/entitlements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export async function updateEntitlement(payload) {
  return fetchLeaveJson(`${API_BASE}/hr/leaves/entitlements/${encodeURIComponent(payload.id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
