import { API_BASE } from './constants'

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.status === 'error') {
    throw new Error(data?.message || res.statusText || 'Request failed.')
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

export const publishKnowledgeArticle = async (articleId) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${articleId}/publish`, {
      method: 'POST',
      credentials: 'include',
    }),
  )

export const unpublishKnowledgeArticle = async (articleId) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${articleId}/unpublish`, {
      method: 'POST',
      credentials: 'include',
    }),
  )

export const archiveKnowledgeArticle = async (articleId) =>
  parseJson(
    await fetch(`${API_BASE}knowledge/articles/${articleId}`, {
      method: 'DELETE',
      credentials: 'include',
    }),
  )
