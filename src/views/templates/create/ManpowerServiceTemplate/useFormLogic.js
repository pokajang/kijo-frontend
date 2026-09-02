import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import dialog from '../../../../components/dialog/dialogService'
import { createTemplate, getTemplate, isAbortError, updateTemplate } from '../../shared/templateApi'
import {
  clearTemplateDraft,
  readTemplateDraftRecord,
  writeTemplateDraft,
} from '../../shared/templateDrafts'
import { fromApiManpowerTemplate, toApiManpowerTemplate } from '../../shared/templateMappers'
import { isSuccess, normalizeTemplateMeta, unwrapRows } from '../../shared/templateUtils'
import {
  formatValidationErrors,
  getValidationErrorMap,
  validateManpowerTemplate,
} from '../../shared/templateValidation'
import { getProposalListPath } from '../../proposals/proposalTabs'
import { getDetailReturnTo } from '../../../../utils/navigation/returnTo'
import { buildTemplateCompletionState, getTemplateReturnState } from '../../shared/templateHandoff'
import { scrollToTemplateField } from '../../shared/templateFormUi'
// Key for localStorage draft
const DRAFT_KEY = 'manpowerProposalDraft'

const INITIAL_TEMPLATE = {
  serviceTitle: '',
  serviceCode: '',
  introduction: '',
  serviceDeliverables: '',
  suppliedManpowerDeliverables: '',
  customSection: '',
}

/**
 * Handles data fetch, state, and submit/reset logic
 * for the Manpower Service Template, now with draft persistence.
 */
export default function useFormLogic({ isEdit, editId }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [templateDetails, setTemplateDetails] = useState(INITIAL_TEMPLATE)
  const [remarks, setRemarks] = useState('')
  const [history, setHistory] = useState([])
  const [templateMeta, setTemplateMeta] = useState({ proposalLanguage: 'en' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [draftRestored, setDraftRestored] = useState(false)
  const [loading, setLoading] = useState(Boolean(isEdit && editId))
  const [loadError, setLoadError] = useState('')
  const saveInFlightRef = useRef(false)

  // --- Load draft on mount (create only) ---------------------------------
  useEffect(() => {
    if (isEdit) return
    const draftRecord = readTemplateDraftRecord('manpower', DRAFT_KEY)
    const draft = draftRecord?.payload
    if (draft) {
      const draftTemplate =
        draft.templateDetails && typeof draft.templateDetails === 'object'
          ? draft.templateDetails
          : {}
      setTemplateDetails({ ...INITIAL_TEMPLATE, ...draftTemplate })
      setRemarks(draft.remarks || '')
      setDraftRestored(true)
    }
  }, [isEdit])

  // --- Auto-save draft on changes (create only) --------------------------
  useEffect(() => {
    if (isEdit) return
    const hasDraftContent =
      JSON.stringify(templateDetails) !== JSON.stringify(INITIAL_TEMPLATE) || Boolean(remarks)
    if (!hasDraftContent) {
      clearTemplateDraft('manpower', DRAFT_KEY)
      return
    }
    writeTemplateDraft('manpower', { templateDetails, remarks }, DRAFT_KEY)
  }, [isEdit, templateDetails, remarks])

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

    getTemplate('manpower', editId, { signal: controller.signal })
      .then((payload) => {
        const data = unwrapRows(payload)[0]
        if (!data) throw new Error('Template not found')

        setTemplateDetails(fromApiManpowerTemplate(data))
        setHistory(data.history || [])
        setTemplateMeta(normalizeTemplateMeta(data))
        setRemarks('')
      })
      .catch((err) => {
        if (isAbortError(err)) return
        setLoadError(err?.message || 'Failed to fetch manpower template.')
        console.error('Failed to fetch manpower template:', err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [isEdit, editId])

  // --- Handler: update any field (incl. title/code formatting) -----------
  const handleEditorChange = (value, field) => {
    let newValue = value ?? ''
    if (field === 'serviceTitle' && newValue) {
      newValue = newValue
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    if (field === 'serviceCode' && newValue) {
      newValue = newValue.toUpperCase()
    }
    setValidationErrors((current) => ({ ...current, [field]: undefined }))
    setTemplateDetails((prev) => ({ ...prev, [field]: newValue }))
  }

  const clearValidationError = (field) => {
    setValidationErrors((current) => ({ ...current, [field]: undefined }))
  }

  const finalizingBmTranslation =
    isEdit &&
    templateMeta?.proposalLanguage === 'ms-MY' &&
    templateMeta?.translationStatus === 'machine_draft'
  const isBmProposal = templateMeta?.proposalLanguage === 'ms-MY'
  const returnPath = getProposalListPath('manpower', isBmProposal ? 'ms-MY' : 'en')
  const returnTo = getDetailReturnTo(location, returnPath)

  // --- Save (create or update) ------------------------------------------
  const handleSave = async () => {
    if (saving || saveInFlightRef.current) return

    const validationErrors = validateManpowerTemplate({ templateDetails, remarks })
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

      const payload = toApiManpowerTemplate({
        templateDetails,
        remarks,
        isEdit,
        id: editId,
      })
      const result = isEdit
        ? await updateTemplate('manpower', editId, payload)
        : await createTemplate('manpower', payload)
      if (!isSuccess(result)) {
        throw new Error(result?.message || 'Save failed')
      }
      dialog.alert(
        finalizingBmTranslation
          ? 'BM proposal saved. It is now available for BM quotations.'
          : isEdit
            ? 'Proposal updated successfully.'
            : 'Proposal created successfully.',
      )
      if (!isEdit) {
        clearTemplateDraft('manpower', DRAFT_KEY)
      }
      navigate(returnTo, {
        replace: true,
        state: !isEdit
          ? buildTemplateCompletionState({ location, serviceKey: 'manpower', response: result })
          : undefined,
      })
    } catch (err) {
      const message = err?.message || 'Failed to save manpower template.'
      console.error('Failed to save manpower template:', err)
      setSaveError(message)
      dialog.alert(`Failed: ${message}`)
    } finally {
      saveInFlightRef.current = false
      setSaving(false)
    }
  }

  // --- Reset form + draft -----------------------------------------------
  const handleReset = () => {
    setTemplateDetails(INITIAL_TEMPLATE)
    setRemarks('')
    setValidationErrors({})
    setSaveError('')
    setDraftRestored(false)
    clearTemplateDraft('manpower', DRAFT_KEY)
  }

  const handleCancel = () => {
    navigate(returnTo, { state: getTemplateReturnState(location) })
  }

  return {
    templateDetails,
    templateMeta,
    finalizingBmTranslation,
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
    handleEditorChange,
    clearValidationError,
    handleSave,
    handleReset,
    handleCancel,
  }
}
