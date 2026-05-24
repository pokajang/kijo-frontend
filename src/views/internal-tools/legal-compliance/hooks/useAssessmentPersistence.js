import { useCallback, useRef, useState } from 'react'
import { saveLegalComplianceAssessment } from '../api/legalComplianceApi'
import { writeLocalDraft } from '../utils/assessmentDraftStorage'
import { buildAssessmentPayload, serializeAssessorOption } from '../utils/assessmentMappers'

const useAssessmentPersistence = ({
  assessmentId,
  setAssessmentId,
  assessmentDetails,
  selectedClient,
  clauseResponses,
  selectedAssessors,
  isAssessmentSaved,
  isReviewing,
  template,
}) => {
  const [isSavingAssessment, setIsSavingAssessment] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const autosaveAbortRef = useRef(null)
  const saveSequenceRef = useRef(0)

  const saveAssessmentStage = useCallback(
    async (stage, { autosave = false } = {}) => {
      if (!autosave && autosaveAbortRef.current) {
        autosaveAbortRef.current.abort()
        autosaveAbortRef.current = null
      }

      const requestSequence = saveSequenceRef.current + 1
      saveSequenceRef.current = requestSequence
      const controller = autosave ? new AbortController() : null
      if (controller) autosaveAbortRef.current = controller

      const payload = {
        ...buildAssessmentPayload({
          assessmentId,
          stage,
          template,
          assessmentDetails,
          selectedClient,
          selectedAssessors,
          clauseResponses,
        }),
        autosave,
      }
      const nextIsAssessmentSaved = ['details_saved', 'review_ready', 'submitted'].includes(stage)
      const nextIsReviewing =
        stage === 'review_ready' || stage === 'submitted'
          ? true
          : stage === 'details_saved'
            ? false
            : isReviewing

      writeLocalDraft({
        assessmentId,
        assessmentDetails: payload.assessmentDetails,
        selectedClient,
        clauseResponses,
        selectedAssessors: payload.selectedAssessors,
        isAssessmentSaved,
        isReviewing,
        template,
      })

      setIsSavingAssessment(true)
      setSaveStatus('saving')
      setSaveError('')

      try {
        const data = await saveLegalComplianceAssessment(payload, { signal: controller?.signal })
        const savedId = data?.data?.id
        if (requestSequence !== saveSequenceRef.current) {
          return { ok: true, id: savedId || assessmentId, stale: true }
        }
        if (savedId) setAssessmentId(savedId)
        writeLocalDraft({
          assessmentId: savedId || assessmentId,
          assessmentDetails: payload.assessmentDetails,
          selectedClient,
          clauseResponses,
          selectedAssessors: payload.selectedAssessors,
          isAssessmentSaved: nextIsAssessmentSaved,
          isReviewing: nextIsReviewing,
          template,
        })
        setSaveStatus('saved')
        return { ok: true, id: savedId || assessmentId }
      } catch (error) {
        if (error.name === 'AbortError') {
          return { ok: false, id: assessmentId, aborted: true }
        }
        setSaveError(
          `${error.message || 'Assessment could not be saved.'} Latest changes are backed up locally.`,
        )
        setSaveStatus('failed')
        return { ok: false, id: assessmentId }
      } finally {
        if (controller && autosaveAbortRef.current === controller) {
          autosaveAbortRef.current = null
        }
        if (requestSequence === saveSequenceRef.current) {
          setIsSavingAssessment(false)
        }
      }
    },
    [
      assessmentDetails,
      assessmentId,
      clauseResponses,
      isAssessmentSaved,
      isReviewing,
      selectedAssessors,
      selectedClient,
      setAssessmentId,
      template,
    ],
  )

  const writeCurrentDraft = useCallback(() => {
    writeLocalDraft({
      assessmentId,
      assessmentDetails,
      selectedClient,
      clauseResponses,
      selectedAssessors: selectedAssessors.map(serializeAssessorOption),
      isAssessmentSaved,
      isReviewing,
      template,
    })
  }, [
    assessmentDetails,
    assessmentId,
    clauseResponses,
    isAssessmentSaved,
    isReviewing,
    selectedAssessors,
    selectedClient,
    template,
  ])

  return {
    isSavingAssessment,
    saveStatus,
    saveError,
    setSaveError,
    saveAssessmentStage,
    writeCurrentDraft,
  }
}

export default useAssessmentPersistence
