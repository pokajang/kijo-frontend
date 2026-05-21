import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import Editor from '../../components/forms/ThemedTinyMCEEditor'
import { DataTableLoadingState } from '../../components/datatable'
import {
  ALLOWED_KNOWLEDGE_IMAGE_TYPES,
  MAX_KNOWLEDGE_IMAGE_BYTES,
  MAX_KNOWLEDGE_IMAGES,
  TARGET_KNOWLEDGE_IMAGE_BYTES,
  relatedRouteOptions,
} from './constants'
import {
  getKnowledgeArticle,
  publishKnowledgeArticle,
  saveKnowledgeArticle,
  unpublishKnowledgeArticle,
} from './knowledgeApi'
import { compressKnowledgeImage, normalizeTags, stripHtml } from './knowledgeUtils'

const editorInit = {
  license_key: 'gpl',
  height: 420,
  menubar: 'format table',
  branding: false,
  promotion: false,
  toolbar_mode: 'wrap',
  block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
  plugins: 'advlist lists link table code',
  toolbar:
    'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright | link table | code',
}

const emptyForm = {
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

const localDraftKey = (articleId) =>
  `knowledgeArticleForm:${articleId ? `edit:${articleId}` : 'create'}`

const serializeDraft = (form) => ({
  title: form.title,
  summary: form.summary,
  category: form.category,
  tagsText: form.tagsText,
  related_route: form.related_route,
  edit_remarks: form.edit_remarks,
  body_html: form.body_html,
  status: form.status,
})

const hasDraftContent = (draft) =>
  Boolean(
    draft.title?.trim() ||
      draft.summary?.trim() ||
      draft.tagsText?.trim() ||
      draft.related_route?.trim() ||
      draft.edit_remarks?.trim() ||
      stripHtml(draft.body_html),
  )

const readLocalDraft = (key) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null')
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const writeLocalDraft = (key, draft) => {
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Local draft recovery is best effort.
  }
}

const removeLocalDraft = (key) => {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Local draft recovery is best effort.
  }
}

const KnowledgeArticleForm = ({ mode = 'create' }) => {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const isEditing = mode === 'edit'
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [processingImages, setProcessingImages] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const previewUrlsRef = useRef(new Set())
  const draftKeyRef = useRef(localDraftKey(isEditing ? articleId : null))
  const initialSnapshotRef = useRef(JSON.stringify(serializeDraft(emptyForm)))

  useEffect(() => {
    draftKeyRef.current = localDraftKey(isEditing ? articleId : null)
  }, [articleId, isEditing])

  const revokePreviewUrl = useCallback((previewUrl) => {
    if (!previewUrl || !previewUrlsRef.current.has(previewUrl)) return
    URL.revokeObjectURL(previewUrl)
    previewUrlsRef.current.delete(previewUrl)
  }, [])

  const revokeAllPreviewUrls = useCallback(() => {
    previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    previewUrlsRef.current.clear()
  }, [])

  useEffect(() => revokeAllPreviewUrls, [revokeAllPreviewUrls])

  useEffect(() => {
    if (isEditing) return

    const savedDraft = readLocalDraft(draftKeyRef.current)
    const baseForm = { ...emptyForm }
    initialSnapshotRef.current = JSON.stringify(serializeDraft(baseForm))

    if (savedDraft && hasDraftContent(savedDraft)) {
      setForm((prev) => ({
        ...prev,
        ...savedDraft,
        images: [],
        newImages: [],
      }))
      setDraftNotice('Recovered an unsaved local draft.')
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) return undefined

    const controller = new AbortController()
    setLoading(true)
    setError('')

    getKnowledgeArticle({ slugOrId: articleId, signal: controller.signal })
      .then((json) => {
        const article = json.data || {}
        const remoteForm = {
          title: article.title || '',
          summary: article.summary || '',
          category: article.category || '',
          tagsText: (article.tags || []).join(', '),
          related_route: article.related_route || '',
          edit_remarks: '',
          body_html: article.body_html || '',
          status: article.status || 'draft',
          images: article.images || [],
          newImages: [],
        }
        initialSnapshotRef.current = JSON.stringify(serializeDraft(remoteForm))

        const savedDraft = readLocalDraft(draftKeyRef.current)
        if (savedDraft && hasDraftContent(savedDraft)) {
          setForm({
            ...remoteForm,
            ...savedDraft,
            images: remoteForm.images,
            newImages: [],
          })
          setDraftNotice('Recovered unsaved local edits for this article.')
        } else {
          setForm(remoteForm)
        }
        if (article.status === 'archived') {
          setError('Archived articles cannot be edited.')
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Failed to load article.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [articleId, isEditing])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isArchived = form.status === 'archived'
  const editRemarksMissing = isEditing && !form.edit_remarks.trim()

  const updateExistingImageDescription = (imageId, description) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((image) =>
        image.id === imageId ? { ...image, description } : image,
      ),
    }))
  }

  const removeExistingImage = (imageId) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== imageId),
    }))
  }

  const updateNewImageDescription = (localId, description) => {
    setForm((prev) => ({
      ...prev,
      newImages: prev.newImages.map((image) =>
        image.localId === localId ? { ...image, description } : image,
      ),
    }))
  }

  const removeNewImage = (localId) => {
    setForm((prev) => {
      const image = prev.newImages.find((item) => item.localId === localId)
      revokePreviewUrl(image?.previewUrl)
      return {
        ...prev,
        newImages: prev.newImages.filter((item) => item.localId !== localId),
      }
    })
  }

  useEffect(() => {
    if (loading || saving) return undefined

    const draft = serializeDraft(form)
    const snapshot = JSON.stringify(draft)
    const changed = snapshot !== initialSnapshotRef.current

    const timer = window.setTimeout(() => {
      if (changed && hasDraftContent(draft)) {
        writeLocalDraft(draftKeyRef.current, draft)
      } else if (!changed || !hasDraftContent(draft)) {
        removeLocalDraft(draftKeyRef.current)
      }
    }, 600)

    return () => window.clearTimeout(timer)
  }, [form, loading, saving])

  const addImages = async (files) => {
    const selectedFiles = Array.from(files || [])
    if (selectedFiles.length === 0) return

    setError('')
    const availableSlots = MAX_KNOWLEDGE_IMAGES - form.images.length - form.newImages.length
    if (availableSlots <= 0) {
      setError(`Attach up to ${MAX_KNOWLEDGE_IMAGES} images per article.`)
      return
    }

    const validFiles = selectedFiles
      .filter(
        (file) =>
          ALLOWED_KNOWLEDGE_IMAGE_TYPES.has(file.type) && file.size <= MAX_KNOWLEDGE_IMAGE_BYTES,
      )
      .slice(0, availableSlots)

    if (validFiles.length < selectedFiles.length) {
      setError('Use JPG, PNG, or WebP images up to 5 MB each.')
    }

    setProcessingImages(true)
    let compressedFiles = []
    try {
      compressedFiles = await Promise.all(
        validFiles.map((file) =>
          compressKnowledgeImage(file, TARGET_KNOWLEDGE_IMAGE_BYTES).catch(() => file),
        ),
      )
    } finally {
      setProcessingImages(false)
    }

    const newImages = compressedFiles.map((file, index) => {
      const previewUrl = URL.createObjectURL(file)
      previewUrlsRef.current.add(previewUrl)
      return {
        localId: `${Date.now()}-${index}-${file.name}`,
        file,
        previewUrl,
        description: '',
      }
    })

    setForm((prev) => ({ ...prev, newImages: [...prev.newImages, ...newImages] }))
  }

  const handlePaste = (event) => {
    const pastedImages = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && ALLOWED_KNOWLEDGE_IMAGE_TYPES.has(item.type))
      .map((item) => item.getAsFile())
      .filter(Boolean)

    if (pastedImages.length === 0) return

    event.preventDefault()
    addImages(pastedImages)
  }

  const validateForm = () => {
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

  const buildPayload = (status) => {
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

  const saveArticle = async (status) => {
    const validationError = validateForm()
    if (processingImages) {
      setError('Wait for image compression to finish.')
      return
    }
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let json = await saveKnowledgeArticle({
        articleId: isEditing ? articleId : null,
        payload: buildPayload(status),
      })

      if (isEditing && json.data?.id && json.data.status !== status) {
        json =
          status === 'published'
            ? await publishKnowledgeArticle(json.data.id)
            : await unpublishKnowledgeArticle(json.data.id)
      }

      setSuccess(json.message || 'Knowledge article saved.')
      removeLocalDraft(draftKeyRef.current)
      revokeAllPreviewUrls()
      window.setTimeout(() => {
        const article = json.data
        navigate(article?.slug ? `/knowledge/${article.slug}` : '/knowledge')
      }, 350)
    } catch (err) {
      setError(err.message || 'Failed to save knowledge article.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>{isEditing ? 'Edit Knowledge Article' : 'Create Knowledge Article'}</strong>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate('/knowledge')}
            >
              Knowledge Hub
            </CButton>
          </CCardHeader>
          <CCardBody onPaste={handlePaste}>
            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}
            {draftNotice && (
              <CAlert
                color="info"
                className="d-flex flex-wrap align-items-center justify-content-between gap-2"
              >
                <span>{draftNotice}</span>
                <CButton
                  color="info"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraftNotice('')}
                >
                  Dismiss
                </CButton>
              </CAlert>
            )}
            {loading ? (
              <DataTableLoadingState message="Loading article..." />
            ) : (
              <>
                <CRow className="g-3 mb-3">
                  <CCol lg={6}>
                    <CFormLabel>Title</CFormLabel>
                    <CFormInput
                      value={form.title}
                      onChange={(event) => updateField('title', event.target.value)}
                    />
                  </CCol>
                  <CCol lg={3}>
                    <CFormLabel>Tags</CFormLabel>
                    <CFormInput
                      value={form.tagsText}
                      placeholder="leave, proposal, crm"
                      onChange={(event) => updateField('tagsText', event.target.value)}
                    />
                  </CCol>
                  <CCol lg={3}>
                    <CFormLabel>Related Page</CFormLabel>
                    <CFormInput
                      list="knowledge-related-routes"
                      value={form.related_route}
                      placeholder="/my/leaves/apply"
                      onChange={(event) => updateField('related_route', event.target.value)}
                    />
                    <datalist id="knowledge-related-routes">
                      {relatedRouteOptions.map((option) => (
                        <option key={option.path} value={option.path} label={option.label} />
                      ))}
                    </datalist>
                  </CCol>
                </CRow>

                <div className="mb-3">
                  <CFormLabel>Summary</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={form.summary}
                    onChange={(event) => updateField('summary', event.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <CFormLabel>Content</CFormLabel>
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    value={form.body_html}
                    init={editorInit}
                    onEditorChange={(value) => updateField('body_html', value)}
                  />
                </div>

                <div className="mb-3">
                  <CFormLabel>Screenshots</CFormLabel>
                  <CFormInput
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      addImages(event.target.files)
                      event.target.value = ''
                    }}
                    disabled={
                      isArchived ||
                      processingImages ||
                      form.images.length + form.newImages.length >= MAX_KNOWLEDGE_IMAGES
                    }
                  />
                  <div className="form-text">
                    Optional. Attach up to 10 JPG, PNG, or WebP images. New images are compressed
                    below 500 KB when possible. You can also paste a copied screenshot into this
                    form.
                  </div>
                </div>

                {(form.images.length > 0 || form.newImages.length > 0) && (
                  <CRow className="g-3 mb-4">
                    {form.images.map((image) => (
                      <CCol md={4} key={image.id}>
                        <div className="border rounded p-2 h-100">
                          <img
                            src={image.url}
                            alt={image.description || 'Knowledge screenshot'}
                            className="w-100 rounded mb-2"
                            style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                          />
                          <CFormInput
                            value={image.description || ''}
                            placeholder="Image description"
                            onChange={(event) =>
                              updateExistingImageDescription(image.id, event.target.value)
                            }
                          />
                          <CButton
                            color="danger"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => removeExistingImage(image.id)}
                          >
                            Remove
                          </CButton>
                        </div>
                      </CCol>
                    ))}
                    {form.newImages.map((image) => (
                      <CCol md={4} key={image.localId}>
                        <div className="border rounded p-2 h-100">
                          <img
                            src={image.previewUrl}
                            alt={image.description || image.file.name}
                            className="w-100 rounded mb-2"
                            style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                          />
                          <CFormInput
                            value={image.description}
                            placeholder="Image description"
                            onChange={(event) =>
                              updateNewImageDescription(image.localId, event.target.value)
                            }
                          />
                          <CButton
                            color="danger"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => removeNewImage(image.localId)}
                          >
                            Remove
                          </CButton>
                        </div>
                      </CCol>
                    ))}
                  </CRow>
                )}

                {isEditing && (
                  <div className="mb-3">
                    <CFormLabel>Edit Remarks</CFormLabel>
                    <CFormTextarea
                      rows={2}
                      value={form.edit_remarks}
                      placeholder="Briefly note what changed or why this article was updated."
                      onChange={(event) => updateField('edit_remarks', event.target.value)}
                    />
                  </div>
                )}

                <div className="d-flex flex-wrap gap-2">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => saveArticle('draft')}
                    disabled={saving || processingImages || isArchived || editRemarksMissing}
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </CButton>
                  <CButton
                    color="primary"
                    onClick={() => saveArticle('published')}
                    disabled={saving || processingImages || isArchived || editRemarksMissing}
                  >
                    {saving ? 'Saving...' : 'Publish'}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate('/knowledge')}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>
                </div>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default KnowledgeArticleForm
