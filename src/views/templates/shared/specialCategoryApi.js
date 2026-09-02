import { API_BASE, fetchTemplateJson } from './templateApi'

const baseUrl = `${API_BASE}proposal-templates/special-categories`

export const listSpecialCategories = ({ manage = false, signal } = {}) =>
  fetchTemplateJson(manage ? `${baseUrl}/manage` : baseUrl, {}, signal)

export const createSpecialCategory = (payload) =>
  fetchTemplateJson(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const updateSpecialCategory = (id, payload) =>
  fetchTemplateJson(`${baseUrl}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const setSpecialCategoryStatus = (id, isActive) =>
  fetchTemplateJson(`${baseUrl}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })

export const deleteSpecialCategory = (id) =>
  fetchTemplateJson(`${baseUrl}/${encodeURIComponent(id)}`, { method: 'DELETE' })
