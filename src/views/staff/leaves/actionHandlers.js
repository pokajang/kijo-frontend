// src/actionHandlers.js

const API_BASE = `${import.meta.env.VITE_API_BASE}`.replace(/\/+$/, '')

// VIEW ALL LEAVES SECTION - 1ST SECTION
// fetch leaves data
export async function getAllLeaves() {
  const res = await fetch(`${API_BASE}/hr/leaves?year=${new Date().getFullYear()}`, {
    credentials: 'include',
  })
  const result = await res.json()
  if (result.status === 'success') {
    return Array.isArray(result.leaves)
      ? result.leaves
      : Array.isArray(result.data)
        ? result.data
        : []
  }
  throw new Error(result.message || 'Failed to fetch leave records')
}

// hr to recommend or approve
export async function leaveAction(id, action, remarks) {
  const res = await fetch(`${API_BASE}/hr/leaves/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, action, remarks }),
  })
  const result = await res.json()
  if (result.status === 'success') {
    return result
  }
  throw new Error(result.message || 'Leave action failed')
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
