import { useEffect } from 'react'
import dialog from '../../../../components/dialog/dialogService'
import { createTemplate, getTemplate, updateTemplate } from '../../shared/templateApi'
import { isSuccess, normalizeTemplateMeta, unwrapRows } from '../../shared/templateUtils'
import {
  fromApiTrainingAgenda,
  fromApiTrainingTemplate,
  toApiTrainingTemplate,
} from '../../shared/templateMappers'
import {
  clearTemplateDraft,
  readTemplateDraft,
  writeTemplateDraft,
} from '../../shared/templateDrafts'
import { formatValidationErrors, validateTrainingTemplate } from '../../shared/templateValidation'
import { getProposalListPath } from '../../proposals/proposalTabs'
// ------ LocalStorage draft key
const DRAFT_KEY = 'trainingProposalDraft'

// ------ Hook: load draft on mount (new proposals only)
export function useLoadDraft(
  isEdit,
  initialTemplateDetails,
  setTemplateDetails,
  setAgendaRows,
  setRemarks,
) {
  useEffect(() => {
    if (isEdit) return
    const draft = readTemplateDraft('training', DRAFT_KEY)
    if (draft) {
      const templateDetails =
        draft.templateDetails && typeof draft.templateDetails === 'object'
          ? draft.templateDetails
          : {}
      setTemplateDetails({ ...initialTemplateDetails, ...templateDetails })
      setAgendaRows(Array.isArray(draft.agendaRows) ? draft.agendaRows : [])
      setRemarks(draft.remarks || '')
    }
  }, [initialTemplateDetails, isEdit, setAgendaRows, setRemarks, setTemplateDetails])
}

// ------ Hook: auto-save draft whenever these change (new proposals only)
export function useAutoSaveDraft(isEdit, templateDetails, agendaRows, remarks) {
  useEffect(() => {
    if (isEdit) return
    writeTemplateDraft('training', { templateDetails, agendaRows, remarks }, DRAFT_KEY)
  }, [isEdit, templateDetails, agendaRows, remarks])
}

// ------ Hook: load edit data when editing
export function useLoadEditData(
  isEdit,
  editId,
  setTemplateDetails,
  setAgendaRows,
  setRemarks,
  setHistory,
  setTemplateMeta,
  setLoading,
  setLoadError,
) {
  useEffect(() => {
    if (!isEdit || !editId) {
      setLoading(false)
      setLoadError('')
      return
    }

    let active = true
    setLoading(true)
    setLoadError('')

    getTemplate('training', editId)
      .then((payload) => {
        if (!active) return
        const p = unwrapRows(payload)[0] || {}
        if (!p.id && !p.template_id && !p.templateId) {
          throw new Error('Training proposal template not found.')
        }

        // ------ populate main fields
        setTemplateDetails(fromApiTrainingTemplate(p))

        // ------ populate agenda
        setAgendaRows(fromApiTrainingAgenda(p.agenda))

        // ------ clear remarks field (user will re-enter)
        setRemarks('')
        // ------ populate existing history if available
        setHistory(p.history || [])
        setTemplateMeta?.(normalizeTemplateMeta(p))
      })
      .catch((err) => {
        if (!active) return
        const message = err?.message || 'Could not load proposal data for editing.'
        console.error(' Failed to load edit data:', err)
        setLoadError(message)
        dialog.alert(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [
    editId,
    isEdit,
    setAgendaRows,
    setHistory,
    setTemplateMeta,
    setLoadError,
    setLoading,
    setRemarks,
    setTemplateDetails,
  ])
}

// ------ Handler: form-field change
export function handleInputChange(e, setTemplateDetails) {
  const { name, value } = e.target

  if (name === 'trainingTitle') {
    const cleaned = value
      .replace(/\s*\btraining\b\s*$/i, '')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    setTemplateDetails((prev) => {
      return {
        ...prev,
        trainingTitle: cleaned,
      }
    })
  } else {
    setTemplateDetails((prev) => ({ ...prev, [name]: value }))
  }
}

// ------ Handler: rich-text editor change
export function handleEditorChange(content, field, setTemplateDetails) {
  setTemplateDetails((prev) => ({ ...prev, [field]: content }))
}

// ------ Handler: Save or Update
export async function handleSave({
  templateDetails,
  agendaRows,
  remarks,
  isEdit,
  editId,
  navigate,
  saving,
  setSaving,
  setSaveError,
  saveInFlightRef,
  finalizingBmTranslation = false,
  isBmProposal = false,
}) {
  if (saving || saveInFlightRef?.current) return

  const validationErrors = validateTrainingTemplate({ templateDetails, agendaRows, remarks })
  if (validationErrors.length > 0) {
    const message = formatValidationErrors(validationErrors)
    setSaveError(message)
    dialog.alert(message)
    return
  }

  setSaveError('')
  if (saveInFlightRef) saveInFlightRef.current = true
  setSaving(true)

  try {
    const confirmed = await dialog.confirm(
      finalizingBmTranslation
        ? 'Save this BM proposal and make it available for BM quotations?'
        : isEdit
          ? 'Are you sure you want to update this proposal?'
          : 'Are you sure you want to create this proposal?',
    )
    if (!confirmed) return

    // strip fully empty rows
    const cleanedAgenda = agendaRows.filter(
      ({ start, end, topic }) => start.trim() !== '' || end.trim() !== '' || topic.trim() !== '',
    )
    const payload = toApiTrainingTemplate({
      templateDetails,
      agenda: cleanedAgenda,
      remarks,
      isEdit,
      id: editId,
    })
    const data = isEdit
      ? await updateTemplate('training', editId, payload)
      : await createTemplate('training', payload)

    if (isSuccess(data)) {
      dialog.alert(
        finalizingBmTranslation
          ? 'BM proposal saved. It is now available for BM quotations.'
          : isEdit
            ? ' Proposal updated successfully.'
            : ' Proposal created successfully.',
      )
      if (!isEdit) {
        clearTemplateDraft('training', DRAFT_KEY)
      }
      navigate(
        getProposalListPath('training', finalizingBmTranslation || isBmProposal ? 'ms-MY' : 'en'),
        { replace: true },
      )
    } else {
      const message = data?.message || 'Failed to save proposal.'
      setSaveError(message)
      dialog.alert(' Failed to save proposal: ' + message)
    }
  } catch (err) {
    const message = err?.message || 'A system error occurred.'
    console.error('Error submitting proposal:', err)
    setSaveError(message)
    dialog.alert(` ${message}`)
  } finally {
    if (saveInFlightRef) saveInFlightRef.current = false
    setSaving(false)
  }
}

// ------ Handler: Reset form
export function handleReset(initialTemplateDetails, setTemplateDetails, setAgendaRows, setRemarks) {
  setTemplateDetails(initialTemplateDetails)
  setAgendaRows([])
  setRemarks('')
  clearTemplateDraft('training', DRAFT_KEY)
}
