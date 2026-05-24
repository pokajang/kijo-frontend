import { useMemo } from 'react'
import { readLocalDraft } from '../utils/assessmentDraftStorage'

const useAssessmentDraft = ({ selectedAssessmentId, selectedTemplateId, shouldStartNew }) => {
  const storedDraft = useMemo(() => readLocalDraft(), [])
  const storedDraftMatchesSelectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !storedDraft?.template?.id) return false
    return String(storedDraft.template.id) === String(selectedTemplateId)
  }, [selectedTemplateId, storedDraft])
  const localDraft = useMemo(() => {
    if (selectedAssessmentId) return null
    if (shouldStartNew) return null
    if (!storedDraft) return null
    if (selectedTemplateId && !storedDraftMatchesSelectedTemplate) return null
    return storedDraft
  }, [
    selectedAssessmentId,
    selectedTemplateId,
    shouldStartNew,
    storedDraft,
    storedDraftMatchesSelectedTemplate,
  ])

  return {
    storedDraft,
    storedDraftMatchesSelectedTemplate,
    localDraft,
  }
}

export default useAssessmentDraft
