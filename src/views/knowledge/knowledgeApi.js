import { API_BASE } from './constants'

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.status === 'error') {
    const error = new Error(data?.message || res.statusText || 'Request failed.')
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

export const getKnowledgeArticles = async ({ signal } = {}) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles`, {
      credentials: 'include',
      signal,
    }),
  )

export const getMyKnowledgeArticles = async ({ signal } = {}) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/my`, {
      credentials: 'include',
      signal,
    }),
  )

export const getKnowledgeArticle = async ({ slugOrId, signal }) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${encodeURIComponent(slugOrId)}`, {
      credentials: 'include',
      signal,
    }),
  )

export const saveKnowledgeArticle = async ({ articleId, payload }) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles${articleId ? `/${articleId}` : ''}`, {
      method: 'POST',
      credentials: 'include',
      body: payload,
    }),
  )

const statusActionOptions = (payload = null, method = 'POST') => {
  const options = {
    method,
    credentials: 'include',
  }

  if (payload && Object.keys(payload).length > 0) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(payload)
  }

  return options
}

export const publishKnowledgeArticle = async (articleId, payload = null) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${articleId}/publish`, {
      ...statusActionOptions(payload),
    }),
  )

export const unpublishKnowledgeArticle = async (articleId, payload = null) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${articleId}/unpublish`, {
      ...statusActionOptions(payload),
    }),
  )

export const archiveKnowledgeArticle = async (articleId, payload = null) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${articleId}`, {
      ...statusActionOptions(payload, 'DELETE'),
    }),
  )
