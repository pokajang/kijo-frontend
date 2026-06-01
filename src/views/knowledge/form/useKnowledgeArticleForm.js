import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ALLOWED_KNOWLEDGE_IMAGE_TYPES,
  MAX_KNOWLEDGE_IMAGE_BYTES,
  MAX_KNOWLEDGE_IMAGES,
  TARGET_KNOWLEDGE_IMAGE_BYTES,
} from '../constants'
import {
  getKnowledgeArticle,
  publishKnowledgeArticle,
  saveKnowledgeArticle,
  unpublishKnowledgeArticle,
} from '../knowledgeApi'
import { compressKnowledgeImage } from '../knowledgeUtils'
import {
  emptyKnowledgeArticleForm,
  hasDraftContent,
  localDraftKey,
  readLocalDraft,
  removeLocalDraft,
  serializeDraft,
  writeLocalDraft,
} from './knowledgeArticleDrafts'
import {
  buildKnowledgeArticlePayload,
  validateKnowledgeArticleForm,
} from './knowledgeArticlePayload'

const useKnowledgeArticleForm = ({ mode = 'create' } = {}) => {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const isEditing = mode === 'edit'
  const [form, setForm] = useState(emptyKnowledgeArticleForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [processingImages, setProcessingImages] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const previewUrlsRef = useRef(new Set())
  const draftKeyRef = useRef(localDraftKey(isEditing ? articleId : null))
  const initialSnapshotRef = useRef(JSON.stringify(serializeDraft(emptyKnowledgeArticleForm)))

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
    const baseForm = { ...emptyKnowledgeArticleForm }
    initialSnapshotRef.current = JSON.stringify(serializeDraft(baseForm))

    if (savedDraft && hasDraftContent(savedDraft)) {
      setForm((prev) => ({
        ...prev,
        ...savedDraft,
        images: [],
        newImages: [],
        status: baseForm.status,
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
            status: remoteForm.status,
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

  const saveArticle = async (status) => {
    const validationError = validateKnowledgeArticleForm({ form, isEditing })
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
      if (isEditing && form.status === 'published' && status === 'draft') {
        await unpublishKnowledgeArticle(articleId, { edit_remarks: form.edit_remarks.trim() })
        setForm((prev) => ({ ...prev, status: 'draft' }))
      }

      let json = await saveKnowledgeArticle({
        articleId: isEditing ? articleId : null,
        payload: buildKnowledgeArticlePayload({ form, isEditing, status }),
      })

      if (isEditing && json.data?.id && json.data.status !== status) {
        const statusRemarks = { edit_remarks: form.edit_remarks.trim() }
        json =
          status === 'published'
            ? await publishKnowledgeArticle(json.data.id, statusRemarks)
            : await unpublishKnowledgeArticle(json.data.id, statusRemarks)
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

  const isArchived = form.status === 'archived'
  const editRemarksMissing = isEditing && !form.edit_remarks.trim()

  return {
    addImages,
    draftNotice,
    editRemarksMissing,
    error,
    form,
    handlePaste,
    isArchived,
    isEditing,
    loading,
    navigate,
    processingImages,
    removeExistingImage,
    removeNewImage,
    saveArticle,
    saving,
    setDraftNotice,
    success,
    updateExistingImageDescription,
    updateField,
    updateNewImageDescription,
  }
}

export default useKnowledgeArticleForm
