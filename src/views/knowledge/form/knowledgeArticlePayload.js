import { normalizeTags, stripHtml } from '../knowledgeUtils'

export const validateKnowledgeArticleForm = ({ form, isEditing }) => {
  if (!form.title.trim()) return 'Title is required.'
  if (!form.summary.trim()) return 'Summary is required.'
  if (isEditing && !form.edit_remarks.trim()) return 'Edit remarks are required.'
  if (!stripHtml(form.body_html)) return 'Article content is required.'
  if (
    [...form.images, ...form.newImages].some((image) => !String(image.description || '').trim())
  ) {
    return 'Add a description for each image.'
  }
  return ''
}

export const buildKnowledgeArticlePayload = ({ form, isEditing, status }) => {
  const payload = new FormData()
  payload.append('title', form.title.trim())
  payload.append('summary', form.summary.trim())
  if (form.category) payload.append('category', form.category)
  payload.append('tags', JSON.stringify(normalizeTags(form.tagsText)))
  payload.append('related_route', form.related_route.trim())
  payload.append('edit_remarks', form.edit_remarks.trim())
  payload.append('body_html', form.body_html)
  if (!isEditing) {
    payload.append('status', status)
  }

  form.images.forEach((image) => {
    payload.append('existing_image_ids[]', image.id)
    payload.append(`existing_image_descriptions[${image.id}]`, image.description || '')
  })
  form.newImages.forEach((image) => {
    payload.append('images[]', image.file)
    payload.append('image_descriptions[]', image.description || '')
  })

  return payload
}
