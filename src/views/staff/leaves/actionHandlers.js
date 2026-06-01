// src/actionHandlers.js

import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'
import { getYearScopedParamSets, mergeUniqueRecordsById } from '../../../components/filters'
import { appendQueryParams } from '../../../utils/detailPages'

const API_BASE = `${import.meta.env.VITE_API_BASE}`.replace(/\/+$/, '')

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
      const res = await fetch(appendQueryParams(`${API_BASE}/hr/leaves`, params), {
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') return normalizeLeavePayload(result)
      throw new Error(result.message || 'Failed to fetch leave records')
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
  const res = await fetch(`${API_BASE}/hr/leaves/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, action, remarks }),
  })
  const result = await res.json()
  if (result.status === 'success') {
    dispatchAppNotificationsChanged()
    return result
  }
  throw new Error(result.message || 'Leave action failed')
}

export async function cancelLeave(id) {
  const res = await fetch(`${API_BASE}/hr/leaves/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id }),
  })
  const result = await res.json()
  if (result.status === 'success') {
    dispatchAppNotificationsChanged()
    return result
  }
  throw new Error(result.message || 'Leave cancellation failed')
}

// LEAVE ENTITLEMENT SECTION
export async function getStaffList() {
  const res = await fetch(`${API_BASE}/staff/list`, {
    credentials: 'include',
  })
  const result = await res.json()
  if (result.status === 'success') {
    return Array.isArray(result.staff)
      ? result.staff
      : Array.isArray(result.data)
        ? result.data
        : []
  }
  throw new Error(result.message || 'Failed to fetch staff list')
}

export async function getAllEntitlements() {
  const res = await fetch(`${API_BASE}/hr/leaves/entitlements`, {
    credentials: 'include',
  })
  const result = await res.json()
  if (result.status === 'success') {
    return Array.isArray(result.allocations)
      ? result.allocations
      : Array.isArray(result.data)
        ? result.data
        : []
  }
  throw new Error(result.message || 'Failed to fetch entitlements')
}

export async function assignLeaveEntitlement(payload) {
  const res = await fetch(`${API_BASE}/hr/leaves/entitlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await res.json()
  if (result.status === 'success') {
    return result
  }
  throw new Error(result.message || 'Assignment failed')
}

export async function deleteEntitlement(id) {
  const res = await fetch(`${API_BASE}/hr/leaves/entitlements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id }),
  })
  const result = await res.json()
  if (result.status === 'success') {
    return result
  }
  throw new Error(result.message || 'Failed to delete entitlement')
}

export async function updateEntitlement(payload) {
  const res = await fetch(`${API_BASE}/hr/leaves/entitlements/${encodeURIComponent(payload.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await res.json()
  if (result.status === 'success') {
    return result
  }
  throw new Error(result.message || 'Failed to update entitlement')
}
