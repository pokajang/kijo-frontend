import { apiJson } from '../../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

export const fetchWorkflowTemplates = async () => {
  const payload = await apiJson(`${API_BASE}workflows/templates`)
  return {
    templates: Array.isArray(payload.templates) ? payload.templates : [],
    canEdit: Boolean(payload.can_edit),
  }
}

export const fetchWorkflowTemplate = async (key) => {
  const payload = await apiJson(`${API_BASE}workflows/templates/${encodeURIComponent(key)}`)
  return {
    template: payload.template || null,
    activeStaff: Array.isArray(payload.active_staff) ? payload.active_staff : [],
    canEdit: Boolean(payload.can_edit),
  }
}

export const saveWorkflowTemplate = async (key, payload) =>
  apiJson(`${API_BASE}workflows/templates/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
