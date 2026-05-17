import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import {
  actionDestinations,
  ALLOWED_NOTICE_IMAGE_TYPES,
  API_BASE,
  CREATE_DRAFT_STORAGE_KEY,
  MAX_NOTICE_IMAGE_BYTES,
  MAX_NOTICE_IMAGES,
} from './constants'
import {
  applyCreateDraft,
  buildPayload,
  createDraftFromForm,
  emptyForm,
  formHasDraftContent,
  normalizeForm,
} from './whatsNewFormUtils'

const CONTENT_EDITOR_INIT = {
  license_key: 'gpl',
  height: 320,
  menubar: 'format table',
  branding: false,
  promotion: false,
  toolbar_mode: 'wrap',
  block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
  plugins: 'advlist lists link table code',
  toolbar:
    'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright | link table | code',
}

const WhatsNewForm = ({ mode }) => {
  const navigate = useNavigate()
  const { noticeId } = useParams()
  const isEditing = mode === 'edit'
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draftRecovered, setDraftRecovered] = useState(false)
  const hasLoadedCreateDraftRef = useRef(false)
  const previewUrlsRef = useRef(new Set())

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
    if (isEditing || hasLoadedCreateDraftRef.current) return
    hasLoadedCreateDraftRef.current = true

    try {
      const rawDraft = window.localStorage.getItem(CREATE_DRAFT_STORAGE_KEY)
      if (!rawDraft) return

      const draft = JSON.parse(rawDraft)
      const recoveredForm = applyCreateDraft(draft)
      if (!formHasDraftContent(recoveredForm)) return

      setForm(recoveredForm)
      setDraftRecovered(true)
    } catch {
      window.localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY)
    }
  }, [isEditing])

  useEffect(() => {
    if (isEditing || !hasLoadedCreateDraftRef.current || saving) return

    try {
      if (formHasDraftContent(form)) {
        window.localStorage.setItem(
          CREATE_DRAFT_STORAGE_KEY,
          JSON.stringify(createDraftFromForm(form)),
        )
      } else {
        window.localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY)
      }
    } catch {
      // Ignore storage failures; the form must remain usable.
    }
  }, [form, isEditing, saving])

  useEffect(() => {
    if (!isEditing) return

    let cancelled = false

    const loadNotice = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${API_BASE}whats-new/${noticeId}`, { credentials: 'include' })
        const data = await res.json()
        if (data?.status !== 'success') {
          throw new Error(data?.message || "Failed to load What's New notice.")
        }
        if (!cancelled) setForm(normalizeForm(data.data))
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load What's New notice.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadNotice()

    return () => {
      cancelled = true
    }
  }, [isEditing, noticeId])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateActionPath = (value) => {
    setForm((prev) => {
      const selectedDestination = actionDestinations.find(
        (destination) => destination.path === value,
      )
      const previousDestination = actionDestinations.find(
        (destination) => destination.path === prev.action_path,
      )
      const shouldSyncLabel =
        selectedDestination &&
        (!prev.action_label || prev.action_label === previousDestination?.actionLabel)

      return {
        ...prev,
        action_path: value,
        action_label: shouldSyncLabel ? selectedDestination.actionLabel : prev.action_label,
      }
    })
  }

  const updateExistingAttachmentDescription = (attachmentId, description) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, description } : attachment,
      ),
    }))
  }

  const removeExistingAttachment = (attachmentId) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((attachment) => attachment.id !== attachmentId),
    }))
  }

  const updateNewAttachmentDescription = (localId, description) => {
    setForm((prev) => ({
      ...prev,
      newAttachments: prev.newAttachments.map((attachment) =>
        attachment.localId === localId ? { ...attachment, description } : attachment,
      ),
    }))
  }

  const removeNewAttachment = (localId) => {
    setForm((prev) => {
      const target = prev.newAttachments.find((attachment) => attachment.localId === localId)
      revokePreviewUrl(target?.previewUrl)

      return {
        ...prev,
        newAttachments: prev.newAttachments.filter((attachment) => attachment.localId !== localId),
      }
    })
  }

  const addNewAttachments = (files) => {
    const selectedFiles = Array.from(files || [])
    if (selectedFiles.length === 0) return

    setError('')
    setForm((prev) => {
      const availableSlots =
        MAX_NOTICE_IMAGES - prev.attachments.length - prev.newAttachments.length
      if (availableSlots <= 0) {
        setError(`Attach up to ${MAX_NOTICE_IMAGES} images per notice.`)
        return prev
      }

      const validFiles = selectedFiles
        .filter(
          (file) =>
            ALLOWED_NOTICE_IMAGE_TYPES.has(file.type) && file.size <= MAX_NOTICE_IMAGE_BYTES,
        )
        .slice(0, availableSlots)

      if (validFiles.length < selectedFiles.length) {
        setError(
          `Use JPG, PNG, or WebP images up to 5 MB each. Attach up to ${MAX_NOTICE_IMAGES} images per notice.`,
        )
      }

      const newAttachments = validFiles.map((file, index) => {
        const previewUrl = URL.createObjectURL(file)
        previewUrlsRef.current.add(previewUrl)

        return {
          localId: `${Date.now()}-${index}-${file.name}`,
          file,
          previewUrl,
          description: '',
        }
      })

      return {
        ...prev,
        newAttachments: [...prev.newAttachments, ...newAttachments],
      }
    })
  }

  const saveNotice = async () => {
    const hasMissingImageDescription =
      form.attachments.some((attachment) => !String(attachment.description || '').trim()) ||
      form.newAttachments.some((attachment) => !String(attachment.description || '').trim())

    if (hasMissingImageDescription) {
      setError('Add a description for each image before saving.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = buildPayload(form)
      const res = await fetch(`${API_BASE}whats-new${isEditing ? `/${noticeId}` : ''}`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json()
      if (data?.status !== 'success') {
        throw new Error(data?.message || "Failed to save What's New notice.")
      }

      setSuccess(data.message || "What's New notice saved.")
      revokeAllPreviewUrls()
      if (!isEditing) window.localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY)
      window.setTimeout(() => navigate('/system-admin/whats-new'), 450)
    } catch (err) {
      setError(err.message || "Failed to save What's New notice.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>{isEditing ? 'Edit Notice' : 'Create Notice'}</strong>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate('/system-admin/whats-new')}
            >
              Back to Records
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}
            {draftRecovered && (
              <CAlert
                color="info"
                className="d-flex flex-wrap justify-content-between align-items-center gap-2"
              >
                <span>Recovered an unsaved draft. Reattach any images before publishing.</span>
                <CButton
                  color="info"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraftRecovered(false)}
                >
                  Dismiss
                </CButton>
              </CAlert>
            )}

            {loading ? (
              <DataTableLoadingState message="Loading notice..." />
            ) : (
              <>
                <div className="mb-3">
                  <CFormLabel>Title</CFormLabel>
                  <CFormInput
                    value={form.title}
                    placeholder="What's New"
                    onChange={(event) => updateField('title', event.target.value)}
                  />
                </div>

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
                    value={form.body}
                    init={CONTENT_EDITOR_INIT}
                    onEditorChange={(content) => updateField('body', content)}
                  />
                </div>

                <div className="mb-3">
                  <CFormLabel>Images</CFormLabel>
                  <CFormInput
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      addNewAttachments(event.target.files)
                      event.target.value = ''
                    }}
                    disabled={
                      form.attachments.length + form.newAttachments.length >= MAX_NOTICE_IMAGES
                    }
                  />
                  <div className="form-text">
                    Optional. Upload up to {MAX_NOTICE_IMAGES} JPG, PNG, or WebP images. Add a short
                    description for each image.
                  </div>

                  {(form.attachments.length > 0 || form.newAttachments.length > 0) && (
                    <CRow className="g-3 mt-1">
                      {form.attachments.map((attachment) => (
                        <CCol md={4} key={attachment.id}>
                          <div className="border rounded p-2 h-100">
                            <img
                              src={attachment.url}
                              alt={
                                attachment.description || attachment.original_name || 'Notice image'
                              }
                              className="w-100 rounded mb-2"
                              style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                            />
                            <CFormInput
                              value={attachment.description || ''}
                              placeholder="Image description"
                              onChange={(event) =>
                                updateExistingAttachmentDescription(
                                  attachment.id,
                                  event.target.value,
                                )
                              }
                            />
                            <CButton
                              color="danger"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => removeExistingAttachment(attachment.id)}
                            >
                              Remove
                            </CButton>
                          </div>
                        </CCol>
                      ))}

                      {form.newAttachments.map((attachment) => (
                        <CCol md={4} key={attachment.localId}>
                          <div className="border rounded p-2 h-100">
                            <img
                              src={attachment.previewUrl}
                              alt={attachment.description || attachment.file.name || 'Notice image'}
                              className="w-100 rounded mb-2"
                              style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                            />
                            <CFormInput
                              value={attachment.description}
                              placeholder="Image description"
                              onChange={(event) =>
                                updateNewAttachmentDescription(
                                  attachment.localId,
                                  event.target.value,
                                )
                              }
                            />
                            <CButton
                              color="danger"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => removeNewAttachment(attachment.localId)}
                            >
                              Remove
                            </CButton>
                          </div>
                        </CCol>
                      ))}
                    </CRow>
                  )}
                </div>

                <CRow className="mb-3">
                  <CCol md={5}>
                    <CFormLabel>Action Label</CFormLabel>
                    <CFormInput
                      value={form.action_label}
                      placeholder="View Monitoring"
                      onChange={(event) => updateField('action_label', event.target.value)}
                    />
                  </CCol>
                  <CCol md={7}>
                    <CFormLabel>Action Path</CFormLabel>
                    <CFormInput
                      list="whats-new-action-paths"
                      value={form.action_path}
                      placeholder="Search page or enter a path"
                      onChange={(event) => updateActionPath(event.target.value)}
                    />
                    <datalist id="whats-new-action-paths">
                      {actionDestinations.map((destination) => (
                        <option
                          key={destination.path}
                          value={destination.path}
                          label={destination.label}
                        />
                      ))}
                    </datalist>
                    <div className="form-text">
                      Choose a known page, or enter a specific path manually when needed.
                    </div>
                  </CCol>
                </CRow>

                <CFormCheck
                  id="whats-new-published"
                  className="mb-3"
                  label="Publish immediately"
                  checked={form.is_published}
                  onChange={(event) => updateField('is_published', event.target.checked)}
                />

                <div className="d-flex gap-2">
                  <CButton color="primary" onClick={saveNotice} disabled={saving}>
                    {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Notice'}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate('/system-admin/whats-new')}
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

export default WhatsNewForm
