export const emptyForm = {
  id: null,
  version: '',
  title: '',
  summary: '',
  body: '',
  attachments: [],
  newAttachments: [],
  action_label: '',
  action_path: '',
  is_published: false,
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const dt = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString()
}

export const stripHtml = (value) => {
  if (!value) return ''
  const container = document.createElement('div')
  container.innerHTML = String(value)
  return container.innerText || container.textContent || ''
}

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''))

const plainTextToHtml = (value) =>
  String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')

export const normalizeRichContent = (value) => {
  const body = String(value || '').trim()
  if (!body) return ''
  return hasHtmlTags(body) ? body : plainTextToHtml(body)
}

export const composeEditorContent = (notice) => {
  const legacyItems = Array.isArray(notice.items) ? notice.items.filter(Boolean) : []
  const legacyList =
    legacyItems.length > 0
      ? `<ul>${legacyItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : ''

  return `${legacyList}${normalizeRichContent(notice.body)}`.trim()
}

export const normalizeForm = (notice) => ({
  id: notice.id,
  version: notice.version || '',
  title: notice.title || '',
  summary: notice.summary || '',
  body: composeEditorContent(notice),
  attachments: Array.isArray(notice.attachments) ? notice.attachments : [],
  newAttachments: [],
  action_label: notice.action_label || '',
  action_path: notice.action_path || '',
  is_published: Boolean(notice.is_published),
})

export const buildPayload = (form) => {
  const payload = new FormData()

  if (form.version.trim()) payload.append('version', form.version.trim())
  payload.append('title', form.title.trim())
  payload.append('summary', form.summary.trim())
  payload.append('body', form.body.trim())
  payload.append('action_label', form.action_label.trim())
  payload.append('action_path', form.action_path.trim())
  payload.append('is_published', form.is_published ? '1' : '0')

  form.attachments.forEach((attachment) => {
    payload.append('existing_attachment_ids[]', String(attachment.id))
    payload.append(
      `existing_attachment_descriptions[${attachment.id}]`,
      attachment.description || '',
    )
  })

  form.newAttachments.forEach((attachment) => {
    payload.append('images[]', attachment.file)
    payload.append('image_descriptions[]', attachment.description || '')
  })

  return payload
}

export const formHasDraftContent = (form) =>
  Boolean(
    form.title.trim() ||
      form.summary.trim() ||
      stripHtml(form.body).trim() ||
      form.action_label.trim() ||
      form.action_path.trim() ||
      form.is_published,
  )

export const createDraftFromForm = (form) => ({
  title: form.title,
  summary: form.summary,
  body: form.body,
  action_label: form.action_label,
  action_path: form.action_path,
  is_published: form.is_published,
})

export const applyCreateDraft = (draft) => ({
  ...emptyForm,
  title: typeof draft?.title === 'string' ? draft.title : '',
  summary: typeof draft?.summary === 'string' ? draft.summary : '',
  body: typeof draft?.body === 'string' ? draft.body : '',
  action_label: typeof draft?.action_label === 'string' ? draft.action_label : '',
  action_path: typeof draft?.action_path === 'string' ? draft.action_path : '',
  is_published: Boolean(draft?.is_published),
})
