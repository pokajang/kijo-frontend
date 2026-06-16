import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import dialog from '../../../../components/dialog/dialogService'
import { createTemplate, getTemplate, isAbortError, updateTemplate } from '../../shared/templateApi'
import {
  clearTemplateDraft,
  readTemplateDraft,
  writeTemplateDraft,
} from '../../shared/templateDrafts'
import { appendSpecialTemplateFormData, fromApiSpecialTemplate } from '../../shared/templateMappers'
import { isSuccess, normalizeTemplateMeta, unwrapRows } from '../../shared/templateUtils'
import { formatValidationErrors, validateSpecialTemplate } from '../../shared/templateValidation'
import { getProposalListPath } from '../../proposals/proposalTabs'
import { validateAttachmentCustomNames, validateNewAttachments } from './attachmentValidation'
// Key for localStorage draft
const DRAFT_KEY = 'specialProposalDraft'
const INITIAL_TEMPLATE_STATE = {
  proposalMode: 'upload',
  serviceTitle: '',
  serviceCode: '',
  serviceSummary: '',
  proposalContent: '',
  defaultLineItems: [],
}

const createDefaultLineItem = () => ({
  title: '',
  description: '',
  unit: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
})

export default function useFormLogic({ isEdit, editId }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [template, setTemplate] = useState(INITIAL_TEMPLATE_STATE)
  const [existingAttachments, setExistingAttachments] = useState([])
  const [newAttachments, setNewAttachments] = useState([])
  const [rejectedAttachments, setRejectedAttachments] = useState([])
  const [removedAttachments, setRemovedAttachments] = useState([])
  const [remarks, setRemarks] = useState('')
  const [history, setHistory] = useState([])
  const [templateMeta, setTemplateMeta] = useState({ proposalLanguage: 'en' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(Boolean(isEdit && editId))
  const [loadError, setLoadError] = useState('')
  const saveInFlightRef = useRef(false)

  // --- Load draft on mount (create only) ---------------------------------
  useEffect(() => {
    if (isEdit) return
    const draft = readTemplateDraft('special', DRAFT_KEY)
    if (draft) {
      const nextTemplate = draft.template || {}
      setTemplate({
        ...INITIAL_TEMPLATE_STATE,
        ...nextTemplate,
        proposalMode:
          nextTemplate.proposalMode === 'write' || nextTemplate.proposalMode === 'upload'
            ? nextTemplate.proposalMode
            : 'upload',
      })
      setRemarks(draft.remarks || '')
    }
  }, [isEdit])

  // --- Auto-save draft on changes (create only) --------------------------
  useEffect(() => {
    if (isEdit) return
    writeTemplateDraft('special', { template, remarks }, DRAFT_KEY)
  }, [isEdit, template, remarks])

  // --- Load existing data on edit ----------------------------------------
  useEffect(() => {
    if (!isEdit || !editId) {
      setLoading(false)
      setLoadError('')
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setLoadError('')

    getTemplate('special', editId, { signal: controller.signal })
      .then((payload) => {
        const data = unwrapRows(payload)[0]
        if (!data) throw new Error('Not found')

        setTemplate(fromApiSpecialTemplate(data))

        setExistingAttachments(data.attachments || [])
        setHistory(data.history || [])
        setTemplateMeta(normalizeTemplateMeta(data))
      })
      .catch((err) => {
        if (isAbortError(err)) return
        setLoadError(err?.message || 'Failed to load special proposal template.')
        console.error(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [isEdit, editId])

  // --- Handlers ---------------------------------------------------------
  const handleInputChange = (e) => {
    let { name, value } = e.target
    if (name === 'proposalMode') {
      setTemplate((prev) => ({ ...prev, proposalMode: value }))
      if (value === 'write') {
        setNewAttachments([])
      }
      return
    }
    if (name === 'serviceTitle' && value) {
      value = value
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    if (name === 'serviceCode' && value) {
      value = value.toUpperCase()
    }
    setTemplate((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditorChange = (html, field) => {
    const targetField = field === 'proposalContent' ? 'proposalContent' : 'serviceSummary'
    setTemplate((prev) => ({ ...prev, [targetField]: html }))
  }

  const handleAddDefaultLineItem = () => {
    setTemplate((prev) => ({
      ...prev,
      defaultLineItems: [...(prev.defaultLineItems || []), createDefaultLineItem()],
    }))
  }

  const handleDefaultLineItemChange = (index, field, value) => {
    setTemplate((prev) => {
      const items = [...(prev.defaultLineItems || [])]
      const current = { ...createDefaultLineItem(), ...(items[index] || {}) }
      const next = { ...current, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) || 0 : Number(next.quantity) || 0
        const unitPrice = field === 'unitPrice' ? Number(value) || 0 : Number(next.unitPrice) || 0
        next.quantity = quantity
        next.unitPrice = unitPrice
        next.amount = parseFloat((quantity * unitPrice).toFixed(2))
      }
      items[index] = next
      return { ...prev, defaultLineItems: items }
    })
  }

  const handleRemoveDefaultLineItem = (index) => {
    setTemplate((prev) => ({
      ...prev,
      defaultLineItems: (prev.defaultLineItems || []).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const finalizingBmTranslation =
    isEdit &&
    templateMeta?.proposalLanguage === 'ms-MY' &&
    templateMeta?.translationStatus === 'machine_draft'
  const isBmProposal = templateMeta?.proposalLanguage === 'ms-MY'
  const returnPath = getProposalListPath('special', isBmProposal ? 'ms-MY' : 'en')

  const handleNewFileChange = (e) => {
    const files = Array.from(e.target.files)
    const { accepted, rejected } = validateNewAttachments(files, [
      ...existingAttachments,
      ...newAttachments,
    ])
    setNewAttachments((prev) => [...prev, ...accepted])
    setRejectedAttachments(rejected)
    e.target.value = ''
  }

  const handleRenameFile = (index, newName) => {
    setNewAttachments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, customName: newName } : item)),
    )
  }

  const handleRemoveNewAttachment = (indexToRemove) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== indexToRemove))
  }

  const removeExistingAttachment = (attachId) => {
    setRemovedAttachments((prev) => [...prev, attachId])
    setExistingAttachments((prev) => prev.filter((att) => att.id !== attachId))
  }

  // --- Save (create or update) ------------------------------------------
  const handleSave = async () => {
    if (saving || saveInFlightRef.current) return

    const validationErrors = validateSpecialTemplate({
      template,
      remarks,
      isEdit,
      newAttachments,
      existingAttachments,
    })
    if (validationErrors.length > 0) {
      const message = formatValidationErrors(validationErrors)
      setSaveError(message)
      dialog.alert(message)
      return
    }

    const attachmentNameErrors = validateAttachmentCustomNames(newAttachments)
    if (attachmentNameErrors.length > 0) {
      const message = attachmentNameErrors
        .map(({ index, message: errorMessage }) => `Attachment ${index + 1}: ${errorMessage}`)
        .join('\n')
      setSaveError(message)
      dialog.alert(message)
      return
    }

    setSaveError('')
    saveInFlightRef.current = true
    setSaving(true)

    try {
      const formData = appendSpecialTemplateFormData({
        formData: new FormData(),
        template,
        remarks,
        isEdit,
        id: editId,
        removedAttachments:
          template.proposalMode === 'write' && isEdit
            ? Array.from(
                new Set([
                  ...removedAttachments,
                  ...existingAttachments.map((attachment) => attachment.id).filter(Boolean),
                ]),
              )
            : removedAttachments,
        newAttachments,
      })
      const json = isEdit
        ? await updateTemplate('special', editId, formData)
        : await createTemplate('special', formData)
      if (!isSuccess(json)) throw new Error(json?.message || 'Save failed')
      dialog.alert(
        finalizingBmTranslation
          ? 'BM proposal saved. It is now available for BM quotations.'
          : isEdit
            ? 'Template updated.'
            : 'Template created.',
      )
      // Clear draft so next creation starts fresh
      if (!isEdit) {
        clearTemplateDraft('special', DRAFT_KEY)
      }
      navigate(returnPath, {
        replace: true,
      })
    } catch (err) {
      const message = err?.message || 'Failed to save.'
      console.error(err)
      setSaveError(message)
      dialog.alert(message)
    } finally {
      saveInFlightRef.current = false
      setSaving(false)
    }
  }

  const handleReset = () => {
    setTemplate(INITIAL_TEMPLATE_STATE)
    setNewAttachments([])
    setRemovedAttachments([])
    setRemarks('')
    // Clear draft
    clearTemplateDraft('special', DRAFT_KEY)
  }

  const handleCancel = () => {
    navigate(location.state?.returnTo || returnPath)
  }

  return {
    template,
    templateMeta,
    finalizingBmTranslation,
    existingAttachments,
    newAttachments,
    rejectedAttachments,
    remarks,
    setRemarks,
    history,
    loading,
    loadError,
    setLoadError,
    saving,
    saveError,
    setSaveError,
    handleInputChange,
    handleEditorChange,
    handleAddDefaultLineItem,
    handleDefaultLineItemChange,
    handleRemoveDefaultLineItem,
    handleNewFileChange,
    handleRenameFile,
    handleRemoveNewAttachment,
    setRejectedAttachments,
    removeExistingAttachment,
    handleSave,
    handleReset,
    handleCancel,
  }
}
