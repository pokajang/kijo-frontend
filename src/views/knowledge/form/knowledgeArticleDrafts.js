import { stripHtml } from '../knowledgeUtils'

export const emptyKnowledgeArticleForm = {
  title: '',
  summary: '',
  category: '',
  tagsText: '',
  related_route: '',
  edit_remarks: '',
  body_html: '',
  status: 'draft',
  images: [],
  newImages: [],
}

export const localDraftKey = (articleId) =>
  `knowledgeArticleForm:${articleId ? `edit:${articleId}` : 'create'}`

export const serializeDraft = (form) => ({
  title: form.title,
  summary: form.summary,
  category: form.category,
  tagsText: form.tagsText,
  related_route: form.related_route,
  edit_remarks: form.edit_remarks,
  body_html: form.body_html,
})

export const hasDraftContent = (draft) =>
  Boolean(
    draft.title?.trim() ||
      draft.summary?.trim() ||
      draft.tagsText?.trim() ||
      draft.related_route?.trim() ||
      draft.edit_remarks?.trim() ||
      stripHtml(draft.body_html),
  )

export const readLocalDraft = (key) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null')
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export const writeLocalDraft = (key, draft) => {
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Local draft recovery is best effort.
  }
}

export const removeLocalDraft = (key) => {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Local draft recovery is best effort.
  }
}
