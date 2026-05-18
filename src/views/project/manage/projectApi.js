const apiBase = () => import.meta.env.VITE_API_BASE

export const emptyList = []

export const normalizeListPayload = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }

  if (Array.isArray(payload?.data?.data)) return payload.data.data

  return emptyList
}

export const normalizeSuccessPayload = (payload) => {
  if (payload?.status === 'success') return { ok: true, data: payload, message: '' }
  if (payload?.status === 'exists')
    return { ok: false, data: payload, message: payload.message || '' }
  if (payload?.status === 'error')
    return { ok: false, data: payload, message: payload.message || '' }
  return { ok: true, data: payload, message: '' }
}

export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const asArray = (value) => (Array.isArray(value) ? value : emptyList)

export const normalizeProjectList = (payload) =>
  normalizeListPayload(payload, ['data', 'projects', 'records']).filter(Boolean)

export const normalizeProjectDetails = (payload) => {
  if (payload?.status === 'success' && payload?.data === null) return null
  if (payload?.status === 'success' && payload?.data && typeof payload.data === 'object') {
    return payload.data
  }
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data
  }
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload
  return null
}

export const normalizeProjectFinance = (payload) => ({
  history: normalizeListPayload(payload, ['history', 'payments', 'payment_history']),
  expenses: normalizeListPayload(payload, ['expenses', 'project_expenses']),
})

export const normalizeProjectVendors = (payload) =>
  normalizeListPayload(payload, ['vendors', 'data', 'records'])

export const normalizeProjectProgress = (payload) =>
  normalizeListPayload(payload, ['data', 'progress', 'records'])

export const normalizeCollaborators = (payload) =>
  normalizeListPayload(payload, ['data', 'collaborators', 'records'])

export const normalizeStaffList = (payload) =>
  normalizeListPayload(payload, ['data', 'staff', 'records'])

const buildUrl = (path) => `${apiBase()}${path}`
const enc = (value) => encodeURIComponent(value)

export async function requestJson(path, options = {}) {
  const { body, signal, headers, ...rest } = options
  const init = {
    credentials: options.credentials ?? 'include',
    ...rest,
    signal,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  }

  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body)
  }

  const res = await fetch(buildUrl(path), init)
  let payload = null

  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed with status ${res.status}`)
  }

  return payload
}

export const listProjects = ({ signal } = {}) =>
  requestJson(`projects?year=${new Date().getFullYear()}`, { signal }).then(normalizeProjectList)

export const getProjectDetails = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}`, {
    signal,
  }).then(normalizeProjectDetails)

export const getProjectFinanceData = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}/finance`, {
    signal,
  }).then(normalizeProjectFinance)

export const getProjectCrmDetails = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}/crm`, {
    signal,
  })

export const getProjectCommercialDocs = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}/commercial-docs`, {
    signal,
  })

export const reloadProjectPoNumber = (projectId) =>
  requestJson(`projects/${enc(projectId)}/reload-po`, {
    method: 'POST',
    body: { project_id: projectId },
  })

export const updateProjectDetails = (project) => {
  const projectId = project.project_id ?? project.id

  return requestJson(`projects/${enc(projectId)}`, {
    method: 'PUT',
    body: {
      ...project,
      project_id: projectId,
    },
  })
}

export const deleteProject = (projectId) =>
  requestJson(`projects/${enc(projectId)}`, {
    method: 'DELETE',
    body: { id: projectId },
  })

export const listAssignedVendors = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}/vendors`, {
    signal,
  }).then(normalizeProjectVendors)

export const listAllVendors = ({ signal } = {}) =>
  requestJson('projects/vendors/all', { signal }).then(normalizeProjectVendors)

export const saveProjectVendor = (_endpoint, payload) =>
  requestJson(
    payload.assignment_id
      ? `projects/${enc(payload.project_id)}/vendors/${enc(payload.assignment_id)}`
      : `projects/${enc(payload.project_id)}/vendors`,
    {
      method: payload.assignment_id ? 'PUT' : 'POST',
      body: payload,
    },
  )

export const removeProjectVendor = (payload) =>
  requestJson(`projects/${enc(payload.project_id)}/vendors/${enc(payload.assignment_id)}`, {
    method: 'DELETE',
    body: payload,
  })

export const listProjectProgress = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}/progress`, {
    signal,
  }).then(normalizeProjectProgress)

export const saveProjectProgress = (_endpoint, payload) =>
  requestJson(
    payload.progress_id
      ? `projects/${enc(payload.project_id)}/progress/${enc(payload.progress_id)}`
      : `projects/${enc(payload.project_id)}/progress`,
    {
      method: payload.progress_id ? 'PUT' : 'POST',
      body: payload,
    },
  )

export const deleteProjectProgress = (payload) =>
  requestJson(`projects/${enc(payload.project_id)}/progress/${enc(payload.progress_id)}`, {
    method: 'DELETE',
    body: payload,
  })

export const listProjectCollaborators = (projectId, { signal } = {}) =>
  requestJson(`projects/${enc(projectId)}/collaborators`, {
    signal,
  }).then(normalizeCollaborators)

export const listStaff = ({ signal } = {}) =>
  requestJson('hr/staff', { signal }).then(normalizeStaffList)

export const addProjectCollaborator = (payload) =>
  requestJson(`projects/${enc(payload.project_id)}/collaborators`, {
    method: 'POST',
    body: payload,
  })

export const removeProjectCollaborator = (payload) =>
  requestJson(`projects/${enc(payload.project_id)}/collaborators/${enc(payload.staff_id)}`, {
    method: 'DELETE',
    body: payload,
  })

export const addProjectExpense = (formData) =>
  requestJson(`projects/${enc(formData.get('project_id'))}/expenses`, {
    method: 'POST',
    body: formData,
  })

export const deleteProjectExpense = (payload) =>
  requestJson(`projects/${enc(payload.project_id)}/expenses/${enc(payload.expense_id)}`, {
    method: 'DELETE',
    body: payload,
  })
