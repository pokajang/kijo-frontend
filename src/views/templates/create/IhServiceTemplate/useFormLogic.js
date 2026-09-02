// src/templates/create/useFormLogic.js

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import dialog from '../../../../components/dialog/dialogService'
import { createTemplate, getTemplate, isAbortError, updateTemplate } from '../../shared/templateApi'
import {
  clearTemplateDraft,
  readTemplateDraftRecord,
  writeTemplateDraft,
} from '../../shared/templateDrafts'
import { fromApiIhTemplate, toApiIhTemplate } from '../../shared/templateMappers'
import { isSuccess, normalizeTemplateMeta, unwrapRows } from '../../shared/templateUtils'
import {
  formatValidationErrors,
  getValidationErrorMap,
  validateIhTemplate,
} from '../../shared/templateValidation'
import { getProposalListPath } from '../../proposals/proposalTabs'
import { getDetailReturnTo } from '../../../../utils/navigation/returnTo'
import { buildTemplateCompletionState, getTemplateReturnState } from '../../shared/templateHandoff'
import { scrollToTemplateField } from '../../shared/templateFormUi'
// Key for saving drafts
const DRAFT_KEY = 'ihProposalDraft'

// Initial blank template
const initialTemplate = {
  serviceTitle: '',
  serviceCode: '',
  introduction: '',
  objectives: '',
  workScope: '',
  schedule: '',
  reference: '',
  otherFields: '',
}

export default function useFormLogic({ isEdit, editId }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [templateDetails, setTemplateDetails] = useState(initialTemplate)
  const [remarks, setRemarks] = useState('')
  const [history, setHistory] = useState([])
  const [templateMeta, setTemplateMeta] = useState({ proposalLanguage: 'en' })
  const [originalTitle, setOriginalTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [draftRestored, setDraftRestored] = useState(false)
  const [loading, setLoading] = useState(Boolean(isEdit && editId))
  const [loadError, setLoadError] = useState('')
  const saveInFlightRef = useRef(false)

  // --- Load draft on mount (new proposals only) -----------------------------
  useEffect(() => {
    if (isEdit) return
    const draftRecord = readTemplateDraftRecord('ih', DRAFT_KEY)
    const draft = draftRecord?.payload
    if (draft) {
      const draftTemplate =
        draft.templateDetails && typeof draft.templateDetails === 'object'
          ? draft.templateDetails
          : {}
      setTemplateDetails({ ...initialTemplate, ...draftTemplate })
      setRemarks(draft.remarks || '')
      setDraftRestored(true)
    }
  }, [isEdit])

  // --- Auto-save to draft on every change (new proposals only) ---------------
  useEffect(() => {
    if (isEdit) return
    const hasDraftContent =
      JSON.stringify(templateDetails) !== JSON.stringify(initialTemplate) || Boolean(remarks)
    if (!hasDraftContent) {
      clearTemplateDraft('ih', DRAFT_KEY)
      return
    }
    writeTemplateDraft('ih', { templateDetails, remarks }, DRAFT_KEY)
  }, [isEdit, templateDetails, remarks])

  // --- Fetch existing record when editing -------------------------------
  useEffect(() => {
    if (!isEdit || !editId) {
      setLoading(false)
      setLoadError('')
      return
    }

    const controller = new AbortController()
    const loadTemplate = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await getTemplate('ih', editId, { signal: controller.signal })
        const p = unwrapRows(data)[0] || {}
        if (!p.id && !p.template_id && !p.templateId) {
          throw new Error('IH proposal template not found.')
        }

        setTemplateDetails(fromApiIhTemplate(p))
        setHistory(p.history || [])
        setOriginalTitle(p.serviceTitle || '')
        setTemplateMeta(normalizeTemplateMeta(p))
      } catch (err) {
        if (!isAbortError(err)) {
          setLoadError(err?.message || 'Failed to load template.')
          console.error('Failed to load template:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadTemplate()
    return () => controller.abort()
  }, [isEdit, editId])

  // --- Handle text-input changes ----------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setValidationErrors((current) => ({ ...current, [name]: undefined }))

    if (name === 'serviceTitle') {
      const cleaned = value
        .replace(/\bproposal\b\s*$/i, '')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

      setTemplateDetails((prev) => {
        if (!isEdit) {
          return {
            ...prev,
            serviceTitle: cleaned,
            introduction: `${cleaned} proposal outlines the scope and methodology...`,
          }
        }
        const intro = originalTitle
          ? prev.introduction.replace(new RegExp(originalTitle, 'i'), cleaned)
          : prev.introduction

        return {
          ...prev,
          serviceTitle: cleaned,
          introduction: intro,
        }
      })

      setOriginalTitle(cleaned)
    } else if (name === 'serviceCode') {
      setTemplateDetails((prev) => ({
        ...prev,
        serviceCode: value.toUpperCase(),
      }))
    } else {
      setTemplateDetails((prev) => ({ ...prev, [name]: value }))
    }
  }

  // --- Handle rich-text editor changes ----------------------------------
  const handleEditorChange = (content, field) => {
    setValidationErrors((current) => ({ ...current, [field]: undefined }))
    setTemplateDetails((prev) => ({ ...prev, [field]: content }))
  }

  const clearValidationError = (field) => {
    setValidationErrors((current) => ({ ...current, [field]: undefined }))
  }

  const finalizingBmTranslation =
    isEdit &&
    templateMeta?.proposalLanguage === 'ms-MY' &&
    templateMeta?.translationStatus === 'machine_draft'
  const isBmProposal = templateMeta?.proposalLanguage === 'ms-MY'
  const returnPath = getProposalListPath('ih', isBmProposal ? 'ms-MY' : 'en')
  const returnTo = getDetailReturnTo(location, returnPath)

  // --- Save or update, then clear draft if new --------------------------
  const handleSave = async () => {
    if (saving || saveInFlightRef.current) return

    const validationErrors = validateIhTemplate({ templateDetails, remarks })
    if (validationErrors.length > 0) {
      const message = formatValidationErrors(validationErrors)
      setValidationErrors(getValidationErrorMap(validationErrors))
      setSaveError(message)
      scrollToTemplateField(validationErrors[0]?.field)
      return
    }
    setValidationErrors({})
    setSaveError('')
    saveInFlightRef.current = true
    setSaving(true)

    try {
      if (finalizingBmTranslation) {
        const confirmed = await dialog.confirm(
          'Save this BM proposal and make it available for BM quotations?',
        )
        if (!confirmed) return
      }

      const payload = toApiIhTemplate({
        templateDetails,
        remarks,
        isEdit,
        id: editId,
      })
      const data = isEdit
        ? await updateTemplate('ih', editId, payload)
        : await createTemplate('ih', payload)
      if (isSuccess(data)) {
        dialog.alert(
          finalizingBmTranslation
            ? 'BM proposal saved. It is now available for BM quotations.'
            : isEdit
              ? ' IH proposal updated.'
              : ' IH proposal created.',
        )
        if (!isEdit) {
          clearTemplateDraft('ih', DRAFT_KEY)
        }
        navigate(returnTo, {
          replace: true,
          state: !isEdit
            ? buildTemplateCompletionState({ location, serviceKey: 'ih', response: data })
            : undefined,
        })
      } else {
        const message = data?.message || 'Unable to save IH proposal.'
        setSaveError(message)
        dialog.alert(' Failed: ' + message)
      }
    } catch (err) {
      const message = err?.message || 'A system error occurred.'
      console.error('Error submitting IH proposal:', err)
      setSaveError(message)
      dialog.alert(` ${message}`)
    } finally {
      saveInFlightRef.current = false
      setSaving(false)
    }
  }

  // --- Reset form and clear draft ---------------------------------------
  const handleReset = () => {
    setTemplateDetails(initialTemplate)
    setRemarks('')
    setValidationErrors({})
    setSaveError('')
    setDraftRestored(false)
    clearTemplateDraft('ih', DRAFT_KEY)
  }

  const handleCancel = () => {
    navigate(returnTo, { state: getTemplateReturnState(location) })
  }

  return {
    templateDetails,
    templateMeta,
    finalizingBmTranslation,
    setTemplateDetails, // still exposed for any child that needs it
    remarks,
    setRemarks,
    history,
    loading,
    loadError,
    setLoadError,
    saving,
    saveError,
    setSaveError,
    validationErrors,
    draftRestored,
    handleInputChange,
    handleEditorChange,
    clearValidationError,
    handleSave,
    handleReset,
    handleCancel,
  }
}
