import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CForm, CRow } from '@coreui/react'

import { useAuth } from '../../../auth/AuthProvider'
import { DataTableLoadingState } from '../../../components/datatable'
import SelectClientCard from '../../crm/quotes/SelectClientCard'
import {
  createLegalComplianceAssessmentRevision,
  getDefaultLegalComplianceTemplate,
  getLegalComplianceAssessment,
  getLegalComplianceAssessmentPdfUrl,
  getLegalComplianceTemplate,
} from './api/legalComplianceApi'
import AssessmentActionBar from './components/assessment/AssessmentActionBar'
import AssessmentClauseAccordion from './components/assessment/AssessmentClauseAccordion'
import AssessmentDetailsForm from './components/assessment/AssessmentDetailsForm'
import AssessmentDetailsSummary from './components/assessment/AssessmentDetailsSummary'
import AssessmentReviewReport from './components/assessment/AssessmentReviewReport'
import SubmitReportModal from './components/assessment/SubmitReportModal'
import useAssessmentDraft from './hooks/useAssessmentDraft'
import useAssessmentPersistence from './hooks/useAssessmentPersistence'
import { defaultLegalComplianceTemplate } from './legalComplianceTemplateData'
import { clearLocalDraft } from './utils/assessmentDraftStorage'
import {
  createAssessmentStateFromRecord,
  createAssessmentTemplateFromDetail,
  createInitialAssessmentDetails,
  createStaffOption,
  getAssessmentDetailsFromClient,
  getAssessmentDetailsFromProject,
} from './utils/assessmentMappers'
import {
  createClauseResponses,
  createEmptyClauseResponses,
  getAssessmentProgress,
  getClauseFields,
  getTemplateSections,
  isRequiredFieldComplete,
} from './utils/templateContent'

const buildAutosaveChangeKey = ({
  assessmentDetails,
  clauseResponses,
  selectedAssessors,
  selectedClient,
  isReviewing,
}) =>
  JSON.stringify({
    assessmentDetails,
    clauseResponses,
    selectedAssessors,
    selectedClient,
    isReviewing,
  })

const LegalComplianceAssessment = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const selectedTemplateId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('templateId')
  }, [location.search])
  const selectedAssessmentId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('assessmentId')
  }, [location.search])
  const shouldOpenAssessmentInReview = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('mode') === 'review'
  }, [location.search])
  const shouldStartNew = location.state?.startNew === true
  const selectedProjectFromStart = location.state?.selectedProject || null
  const isDraftPersistenceEnabled = useRef(!selectedAssessmentId)
  const { localDraft } = useAssessmentDraft({
    selectedAssessmentId,
    selectedTemplateId,
    shouldStartNew,
  })
  const sessionAssessmentDetails = useMemo(() => createInitialAssessmentDetails(user), [user])
  const sessionAssessorOption = useMemo(() => createStaffOption(user), [user])
  const initialTemplate = localDraft?.template || defaultLegalComplianceTemplate
  const initialSections = getTemplateSections(initialTemplate.content)
  const [template, setTemplate] = useState(initialTemplate)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(
    Boolean(selectedAssessmentId) || !localDraft?.template,
  )
  const [templateError, setTemplateError] = useState('')
  const sections = useMemo(() => getTemplateSections(template.content), [template])
  const [assessmentId, setAssessmentId] = useState(() => localDraft?.assessmentId || null)
  const [assessmentDetails, setAssessmentDetails] = useState(() => {
    const baseDetails = localDraft?.assessmentDetails || createInitialAssessmentDetails(user)
    return selectedProjectFromStart
      ? { ...baseDetails, ...getAssessmentDetailsFromProject(selectedProjectFromStart) }
      : baseDetails
  })
  const [selectedClient, setSelectedClient] = useState(() => localDraft?.selectedClient || null)
  const [clauseResponses, setClauseResponses] = useState(() =>
    createClauseResponses(localDraft?.clauseResponses, initialSections),
  )
  const [isAssessmentSaved, setIsAssessmentSaved] = useState(() =>
    Boolean(localDraft?.isAssessmentSaved),
  )
  const [isReviewing, setIsReviewing] = useState(() => Boolean(localDraft?.isReviewing))
  const [isSubmittedRecord, setIsSubmittedRecord] = useState(false)
  const [selectedAssessors, setSelectedAssessors] = useState(
    () => localDraft?.selectedAssessors || (sessionAssessorOption ? [sessionAssessorOption] : []),
  )
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false)
  const [isCreatingRevision, setIsCreatingRevision] = useState(false)
  const autosaveReadyRef = useRef(false)
  const autosaveBaselineRef = useRef('')
  const autosaveTimerRef = useRef(null)
  const isSavingAssessmentRef = useRef(false)
  const isReviewTransitionRef = useRef(false)
  const saveAssessmentStageRef = useRef(null)
  const [accordionState, setAccordionState] = useState(() => ({
    key: 'initial',
    activeItemKey: sections[0]?.id,
  }))
  const {
    isSavingAssessment,
    saveStatus,
    saveError,
    setSaveError,
    saveAssessmentStage,
    writeCurrentDraft,
  } = useAssessmentPersistence({
    assessmentId,
    setAssessmentId,
    assessmentDetails,
    selectedClient,
    clauseResponses,
    selectedAssessors,
    isAssessmentSaved,
    isReviewing,
    template,
  })
  const assessmentProgress = useMemo(
    () => getAssessmentProgress(sections, clauseResponses),
    [sections, clauseResponses],
  )
  const autosaveChangeKey = useMemo(
    () =>
      buildAutosaveChangeKey({
        assessmentDetails,
        clauseResponses,
        selectedAssessors,
        selectedClient,
        isReviewing,
      }),
    [assessmentDetails, clauseResponses, isReviewing, selectedAssessors, selectedClient],
  )
  const saveStatusText = isSavingAssessment
    ? 'Saving...'
    : saveStatus === 'saved'
      ? 'Saved just now'
      : saveStatus === 'failed'
        ? 'Save failed'
        : ''
  const saveStatusTone =
    saveStatus === 'saved' ? 'success' : saveStatus === 'failed' ? 'danger' : 'secondary'
  const templateTier = template.assessment_tier || template.content?.assessment_tier || 'free'
  const isPaidAssessment = templateTier === 'paid'
  const hasLinkedProject = Boolean(assessmentDetails.projectId)

  useEffect(() => {
    isDraftPersistenceEnabled.current = !selectedAssessmentId
  }, [selectedAssessmentId])

  useEffect(() => {
    isSavingAssessmentRef.current = isSavingAssessment
  }, [isSavingAssessment])

  useEffect(() => {
    saveAssessmentStageRef.current = saveAssessmentStage
  }, [saveAssessmentStage])

  useEffect(() => {
    if (isDraftPersistenceEnabled.current) writeCurrentDraft()
  }, [writeCurrentDraft])

  useEffect(() => {
    if (selectedAssessmentId) return undefined
    if (localDraft?.template && !shouldStartNew && !selectedTemplateId) return undefined

    const controller = new AbortController()

    ;(async () => {
      try {
        setIsLoadingTemplate(true)
        setTemplateError('')
        const payload = selectedTemplateId
          ? await getLegalComplianceTemplate(selectedTemplateId, { signal: controller.signal })
          : await getDefaultLegalComplianceTemplate({ signal: controller.signal })
        const nextTemplate = selectedTemplateId
          ? createAssessmentTemplateFromDetail(payload?.template)
          : payload?.template

        if (!nextTemplate?.content) {
          throw new Error('Could not load legal compliance template.')
        }

        setTemplate(nextTemplate)
        const nextSections = getTemplateSections(nextTemplate.content)
        setClauseResponses((current) => createClauseResponses(current, nextSections))
        setAccordionState({
          key: `template-${nextTemplate.id || 'default'}-${Date.now()}`,
          activeItemKey: nextSections[0]?.id,
        })
      } catch (error) {
        if (error.name === 'AbortError') return
        const nextError = error.message || 'Could not load legal compliance template.'
        setTemplateError(
          selectedTemplateId ? nextError : `${nextError} Showing local fallback template.`,
        )
      } finally {
        if (!controller.signal.aborted) setIsLoadingTemplate(false)
      }
    })()

    return () => controller.abort()
  }, [localDraft?.template, selectedAssessmentId, selectedTemplateId, shouldStartNew])

  useEffect(() => {
    if (!selectedAssessmentId) return undefined

    isDraftPersistenceEnabled.current = false
    const controller = new AbortController()

    ;(async () => {
      try {
        setIsLoadingTemplate(true)
        setTemplateError('')
        setSaveError('')
        const payload = await getLegalComplianceAssessment(selectedAssessmentId, {
          signal: controller.signal,
        })
        const recordState = createAssessmentStateFromRecord(payload.record)

        setAssessmentId(recordState.assessmentId)
        setTemplate(recordState.template)
        setAssessmentDetails(recordState.assessmentDetails)
        setSelectedClient(recordState.selectedClient)
        setClauseResponses(recordState.clauseResponses)
        setSelectedAssessors(recordState.selectedAssessors)
        setIsAssessmentSaved(recordState.isAssessmentSaved)
        setIsSubmittedRecord(recordState.isSubmittedRecord)
        setIsReviewing(shouldOpenAssessmentInReview || payload.record.stage !== 'details_saved')
        setAccordionState({
          key: `assessment-${payload.record.id}-${Date.now()}`,
          activeItemKey: recordState.sections[0]?.id,
        })
      } catch (error) {
        if (error.name === 'AbortError') return
        setTemplateError(error.message || 'Could not load assessment record.')
      } finally {
        if (!controller.signal.aborted) setIsLoadingTemplate(false)
      }
    })()

    return () => controller.abort()
  }, [selectedAssessmentId, setSaveError, shouldOpenAssessmentInReview])

  useEffect(() => {
    if (selectedAssessmentId) return

    setAssessmentDetails((current) => {
      if (current.assessorName || current.assessorEmail) return current
      return {
        ...current,
        assessorName: sessionAssessmentDetails.assessorName,
        assessorEmail: sessionAssessmentDetails.assessorEmail,
      }
    })
    setSelectedAssessors((current) => {
      if (current.length > 0 || !sessionAssessorOption) return current
      return [sessionAssessorOption]
    })
  }, [selectedAssessmentId, sessionAssessmentDetails, sessionAssessorOption])

  useEffect(() => {
    const canAutosave = Boolean(assessmentId && isAssessmentSaved && !isSubmittedRecord)

    if (!canAutosave) {
      autosaveReadyRef.current = false
      autosaveBaselineRef.current = ''
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      return undefined
    }

    if (isSavingAssessment) return undefined

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true
      autosaveBaselineRef.current = autosaveChangeKey
      return undefined
    }

    if (autosaveBaselineRef.current === autosaveChangeKey) return undefined

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null
      if (isSavingAssessmentRef.current) return
      autosaveBaselineRef.current = autosaveChangeKey
      saveAssessmentStageRef.current?.(isReviewing ? 'review_ready' : 'details_saved', {
        autosave: true,
      })
    }, 1500)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [
    assessmentId,
    autosaveChangeKey,
    isAssessmentSaved,
    isReviewing,
    isSavingAssessment,
    isSubmittedRecord,
  ])

  const suppressAutosaveForCurrentState = ({ nextIsReviewing = isReviewing } = {}) => {
    autosaveReadyRef.current = true
    autosaveBaselineRef.current = buildAutosaveChangeKey({
      assessmentDetails,
      clauseResponses,
      selectedAssessors,
      selectedClient,
      isReviewing: nextIsReviewing,
    })
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }

  const handleAssessmentChange = (field, value) => {
    setAssessmentDetails((current) => ({ ...current, [field]: value }))
  }

  const handleClientChange = (client) => {
    setSelectedClient(client)
    setAssessmentDetails((current) => {
      if (!client) {
        return {
          ...current,
          companyName: '',
          siteLocation: '',
          clientCompanyId: null,
          clientBranchId: null,
          clientPicId: null,
          clientPicName: '',
          clientPicEmail: '',
        }
      }

      return {
        ...current,
        ...getAssessmentDetailsFromClient(client),
      }
    })
  }

  const handleCreateClient = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('cameFromLegalComplianceAssessment', 'true')
      window.sessionStorage.setItem(
        'legalComplianceAssessmentReturnPath',
        `${window.location.pathname}${window.location.search}`,
      )
    }
    navigate('/client/create')
  }

  const handleFieldChange = (clauseId, fieldKey, value) => {
    setClauseResponses((current) => ({
      ...current,
      [clauseId]: {
        ...(current[clauseId] || {}),
        [fieldKey]: value,
      },
    }))
  }

  const handleSaveAssessmentDraft = async () => {
    suppressAutosaveForCurrentState()
    const result = await saveAssessmentStage('details_saved')
    if (result.ok) setIsSubmittedRecord(false)
  }

  const handleReset = () => {
    suppressAutosaveForCurrentState()
    isDraftPersistenceEnabled.current = true
    setAssessmentId(null)
    setAssessmentDetails(
      selectedProjectFromStart
        ? {
            ...sessionAssessmentDetails,
            ...getAssessmentDetailsFromProject(selectedProjectFromStart),
          }
        : sessionAssessmentDetails,
    )
    setSelectedClient(null)
    setClauseResponses(createEmptyClauseResponses(sections))
    setIsAssessmentSaved(false)
    setIsReviewing(false)
    setIsSubmittedRecord(false)
    setAccordionState({
      key: `reset-${Date.now()}`,
      activeItemKey: sections[0]?.id,
    })
    setSelectedAssessors(sessionAssessorOption ? [sessionAssessorOption] : [])
    setSaveError('')
  }

  const handleSaveAssessmentDetails = async (event) => {
    event.preventDefault()
    if (!selectedAssessmentId && !assessmentDetails.projectId && !selectedClient?.company_id) {
      setSaveError('Select a CRM client before saving assessment details.')
      return
    }
    suppressAutosaveForCurrentState()
    const result = await saveAssessmentStage('details_saved')
    if (!result.ok) return
    setIsSubmittedRecord(false)
    setIsAssessmentSaved(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSavingAssessment || isReviewTransitionRef.current) return

    const firstIncompleteSection = sections.find((section) =>
      section.clauses.some((clause) => {
        const response = clauseResponses[clause.id] || {}
        return getClauseFields(clause).some((field) => !isRequiredFieldComplete(field, response))
      }),
    )

    if (firstIncompleteSection) {
      setSaveError('Complete all required clause fields before reviewing the report.')
      setAccordionState({
        key: `missing-required-${firstIncompleteSection.id}-${Date.now()}`,
        activeItemKey: firstIncompleteSection.id,
      })
      return
    }

    // Review is still inside the assessment workflow, so persist the current snapshot before preview.
    isReviewTransitionRef.current = true
    try {
      suppressAutosaveForCurrentState({ nextIsReviewing: true })
      const result = await saveAssessmentStage('review_ready')
      if (!result.ok) return
      setIsSubmittedRecord(false)
      setIsReviewing(true)
    } finally {
      isReviewTransitionRef.current = false
    }
  }

  const handleSaveReviewDraft = async () => {
    suppressAutosaveForCurrentState()
    const result = await saveAssessmentStage('review_ready')
    if (result.ok) setIsSubmittedRecord(false)
  }

  const handleConfirmSubmitReport = async () => {
    suppressAutosaveForCurrentState()
    const result = await saveAssessmentStage('submitted')
    if (!result.ok) return

    isDraftPersistenceEnabled.current = false
    clearLocalDraft()
    setIsSubmittedRecord(true)
    setIsSubmitConfirmVisible(false)
    navigate('/internal-tools/legal-compliance/records', {
      state: { submittedAssessmentId: result.id },
    })
  }

  const handleExportPdf = () => {
    if (!assessmentId) return
    window.open(getLegalComplianceAssessmentPdfUrl(assessmentId), '_blank', 'noopener,noreferrer')
  }

  const handleCreateRevision = async () => {
    if (!assessmentId || isCreatingRevision) return

    try {
      setIsCreatingRevision(true)
      setSaveError('')
      const payload = await createLegalComplianceAssessmentRevision(assessmentId)
      const revisionId = payload?.data?.id
      if (!revisionId) throw new Error('Assessment revision could not be created.')
      navigate(`/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(revisionId)}`)
    } catch (error) {
      setSaveError(error.message || 'Assessment revision could not be created.')
    } finally {
      setIsCreatingRevision(false)
    }
  }

  const renderSaveError = () =>
    saveError ? (
      <CCol xs={12}>
        <CAlert color="warning" className="mb-0">
          {saveError}
        </CAlert>
      </CCol>
    ) : null

  const isTargetedLoad = Boolean(selectedAssessmentId || selectedTemplateId)

  if (isTargetedLoad && isLoadingTemplate) {
    return (
      <DataTableLoadingState
        message={selectedAssessmentId ? 'Loading assessment record...' : 'Loading template...'}
      />
    )
  }

  if (isTargetedLoad && templateError) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
              <strong>
                {selectedAssessmentId ? 'Assessment Not Loaded' : 'Template Not Loaded'}
              </strong>
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    selectedAssessmentId
                      ? '/internal-tools/legal-compliance/records'
                      : '/internal-tools/legal-compliance/select-template',
                  )
                }
              >
                Back
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CAlert color="danger" className="mb-0">
                {templateError}
              </CAlert>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  if (isReviewing) {
    return (
      <>
        <CRow className="g-4">
          {renderSaveError()}
          <CCol xs={12}>
            <AssessmentReviewReport
              assessmentDetails={assessmentDetails}
              sections={sections}
              clauseResponses={clauseResponses}
              isSavingAssessment={isSavingAssessment}
              onBack={() =>
                isSubmittedRecord
                  ? navigate('/internal-tools/legal-compliance/records')
                  : setIsReviewing(false)
              }
            />
          </CCol>

          <CCol xs={12}>
            <AssessmentActionBar sticky statusText={saveStatusText} statusTone={saveStatusTone}>
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={isSubmittedRecord ? handleCreateRevision : () => setIsReviewing(false)}
                disabled={isSavingAssessment || isCreatingRevision}
              >
                {isSubmittedRecord
                  ? isCreatingRevision
                    ? 'Creating...'
                    : 'Create Revision'
                  : 'Edit Form'}
              </CButton>
              {isSubmittedRecord ? (
                <CButton
                  color="primary"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={isSavingAssessment || !assessmentId}
                >
                  Export PDF
                </CButton>
              ) : (
                <>
                  <CButton
                    color="secondary"
                    size="sm"
                    variant="outline"
                    onClick={handleSaveReviewDraft}
                    disabled={isSavingAssessment}
                  >
                    {isSavingAssessment ? 'Saving...' : 'Save Assessment Draft'}
                  </CButton>
                  <CButton
                    color="primary"
                    size="sm"
                    onClick={() => setIsSubmitConfirmVisible(true)}
                    disabled={isSavingAssessment}
                  >
                    Submit Report
                  </CButton>
                </>
              )}
            </AssessmentActionBar>
          </CCol>
        </CRow>

        <SubmitReportModal
          visible={isSubmitConfirmVisible}
          isSaving={isSavingAssessment}
          onClose={() => setIsSubmitConfirmVisible(false)}
          onConfirm={handleConfirmSubmitReport}
        />
      </>
    )
  }

  if (!isAssessmentSaved) {
    return (
      <>
        {saveError && <CRow className="g-4">{renderSaveError()}</CRow>}
        {isPaidAssessment && hasLinkedProject ? (
          <CRow className="g-4">
            <CCol xs={12}>
              <AssessmentDetailsSummary assessmentDetails={assessmentDetails} />
            </CCol>
          </CRow>
        ) : (
          <CRow className="g-4">
            <SelectClientCard
              selectedClient={selectedClient}
              onClientChange={handleClientChange}
              title="Assessment Client"
              addressLabel="Assessment Address"
              contactLabel="Client PIC"
              onBack={() => navigate(-1)}
              onCreateClient={handleCreateClient}
            />
          </CRow>
        )}
        <AssessmentDetailsForm
          assessmentDetails={assessmentDetails}
          isSavingAssessment={isSavingAssessment}
          onSubmit={handleSaveAssessmentDetails}
          onBack={() => navigate(-1)}
          onReset={handleReset}
          onAssessmentChange={handleAssessmentChange}
        />
      </>
    )
  }

  return (
    <CForm onSubmit={handleSubmit}>
      <CRow className="g-4">
        {renderSaveError()}
        {templateError && (
          <CCol xs={12}>
            <CAlert color="warning" className="mb-0">
              {templateError}
            </CAlert>
          </CCol>
        )}
        {isLoadingTemplate && (
          <CCol xs={12}>
            <CAlert color="info" className="mb-0">
              Loading legal compliance template...
            </CAlert>
          </CCol>
        )}
        <CCol xs={12}>
          <AssessmentDetailsSummary
            assessmentDetails={assessmentDetails}
            actions={
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() => setIsAssessmentSaved(false)}
              >
                Edit Details
              </CButton>
            }
          />
        </CCol>

        <CCol xs={12}>
          <div className="small text-body-secondary mb-2">
            {assessmentProgress.total} clauses | {assessmentProgress.completed} completed |{' '}
            {assessmentProgress.comply} comply | {assessmentProgress.notComply} not comply
          </div>
          <AssessmentClauseAccordion
            sections={sections}
            clauseResponses={clauseResponses}
            accordionState={accordionState}
            onFieldChange={handleFieldChange}
          />
        </CCol>

        <CCol xs={12}>
          <AssessmentActionBar sticky statusText={saveStatusText} statusTone={saveStatusTone}>
            <CButton
              type="button"
              color="secondary"
              size="sm"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSavingAssessment}
            >
              Back
            </CButton>
            <CButton
              type="button"
              color="secondary"
              size="sm"
              variant="outline"
              onClick={handleSaveAssessmentDraft}
              disabled={isSavingAssessment}
            >
              {isSavingAssessment ? 'Saving...' : 'Save Assessment Draft'}
            </CButton>
            <CButton type="submit" color="primary" size="sm" disabled={isSavingAssessment}>
              {isSavingAssessment ? 'Saving...' : 'Review Report'}
            </CButton>
          </AssessmentActionBar>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default LegalComplianceAssessment
