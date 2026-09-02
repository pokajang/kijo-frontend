import React, { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CRow, CCol, CFormInput } from '@coreui/react'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import { getProposalListPath } from '../../proposals/proposalTabs'
import { getDetailReturnTo } from '../../../../utils/navigation/returnTo'
import { getTemplateReturnState } from '../../shared/templateHandoff'
import dialog from '../../../../components/dialog/dialogService'
import TemplateDraftNotice from '../../shared/TemplateDraftNotice'
import TemplateFieldLabel from '../../shared/TemplateFieldLabel'
import TemplateFormActions from '../../shared/TemplateFormActions'
import TemplateSectionHeader from '../../shared/TemplateSectionHeader'
import { useTemplateDirtyState } from '../../shared/templateFormUi'

import MainBody from './MainBody'
import TrainingRequirementsSection from './TrainingRequirementsSection'
import AgendaTable from './AgendaTable'
import ProposalRemarks from './ProposalRemarks'

import {
  useLoadDraft,
  useAutoSaveDraft,
  useLoadEditData,
  handleInputChange,
  handleEditorChange,
  handleSave,
  handleReset,
} from './actionHandlers'

// ------ Base template for "Create"
const initialTemplateDetails = {
  trainingTitle: '',
  introduction: '',
  trainingCode: '',
  hrdNo: '',
  objectives: '',
  modules: '',
  trainingRequirements: 'Training room, projector, and whiteboard',
  additionalTrainingRequirements: '',
  trainingMaterials: 'Hardcopy lecture slides',
  lectureMedium:
    'Presentation slides and terminology will be in English. Explanations and discussions will be conducted primarily in Bahasa Melayu.',
  method_theory: true,
  method_theory_desc: 'Dynamic and interactive presentation',
  method_practical: false,
  method_practical_desc: 'Participant oriented, hands-on experience',
  // IMPORTANT: keep empty here, do not set "1day"
  duration: '',
}

const TrainingServiceTemplate = ({ isEdit, editId, onDirtyChange }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [templateDetails, setTemplateDetails] = useState(initialTemplateDetails)
  const [remarks, setRemarks] = useState('')
  const [history, setHistory] = useState([])
  const [templateMeta, setTemplateMeta] = useState({ proposalLanguage: 'en' })
  const [agendaRows, setAgendaRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [loading, setLoading] = useState(Boolean(isEdit && editId))
  const [loadError, setLoadError] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)
  const saveInFlightRef = useRef(false)

  // ------ wire up hooks
  useLoadDraft(
    isEdit,
    initialTemplateDetails,
    setTemplateDetails,
    setAgendaRows,
    setRemarks,
    setDraftRestored,
  )
  const hasDraftContent =
    JSON.stringify(templateDetails) !== JSON.stringify(initialTemplateDetails) ||
    agendaRows.length > 0 ||
    Boolean(remarks)
  useAutoSaveDraft(isEdit, templateDetails, agendaRows, remarks, hasDraftContent)
  useLoadEditData(
    isEdit,
    editId,
    setTemplateDetails,
    setAgendaRows,
    setRemarks,
    setHistory,
    setTemplateMeta,
    setLoading,
    setLoadError,
  )

  // ------ event handlers
  const clearValidationError = (...fields) => {
    setValidationErrors((prev) => {
      const next = { ...prev }
      fields.forEach((field) => {
        delete next[field]
      })
      return next
    })
  }

  const clearValidationErrorsByPrefix = (...prefixes) => {
    setValidationErrors((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(
          ([field]) => !prefixes.some((prefix) => field === prefix || field.startsWith(prefix)),
        ),
      ),
    )
  }

  const onInputChange = (e) => {
    clearValidationError(e.target.name)
    handleInputChange(e, setTemplateDetails)
  }

  const onEditorChange = (content, field) => {
    clearValidationError(field)
    handleEditorChange(content, field, setTemplateDetails)
  }

  const finalizingBmTranslation =
    templateMeta?.proposalLanguage === 'ms-MY' &&
    templateMeta?.translationStatus === 'machine_draft'
  const isBmProposal = templateMeta?.proposalLanguage === 'ms-MY'
  const returnPath = getProposalListPath('training', isBmProposal ? 'ms-MY' : 'en')
  const returnTo = getDetailReturnTo(location, returnPath)
  const isDirty = useTemplateDirtyState(
    { templateDetails, agendaRows, remarks },
    onDirtyChange,
    !loading,
  )

  const onCancel = async () => {
    if (isDirty) {
      const confirmed = await dialog.confirm('Discard these unsaved template changes?')
      if (!confirmed) return
    }
    navigate(returnTo, { state: getTemplateReturnState(location) })
  }

  const onSave = () =>
    handleSave({
      templateDetails,
      agendaRows,
      remarks,
      isEdit,
      editId,
      navigate,
      saving,
      setSaving,
      setSaveError,
      setValidationErrors,
      saveInFlightRef,
      finalizingBmTranslation,
      isBmProposal,
      returnTo,
      location,
    })

  const onReset = async () => {
    if (isDirty) {
      const confirmed = await dialog.confirm(
        'Reset this proposal form and permanently clear its local draft?',
      )
      if (!confirmed) return
    }
    setValidationErrors({})
    setSaveError('')
    setDraftRestored(false)
    handleReset(initialTemplateDetails, setTemplateDetails, setAgendaRows, setRemarks)
  }

  return (
    <>
      <TemplateFormStatus
        loading={loading}
        loadError={loadError}
        saveError={saveError}
        onClearSaveError={() => setSaveError('')}
      />
      {!loading && !loadError && (
        <>
          <BmDraftReviewNotice record={templateMeta} />
          <TemplateDraftNotice restored={draftRestored} />
          <TemplateSectionHeader
            title="Basic details"
            description="Name the reusable training template and provide its internal reference details."
          />
          <CRow className="mb-3">
            <CCol md={7}>
              <TemplateFieldLabel htmlFor="training-template-title">
                Training title
              </TemplateFieldLabel>
              <CFormInput
                id="training-template-title"
                type="text"
                name="trainingTitle"
                value={templateDetails.trainingTitle}
                onChange={onInputChange}
                placeholder="e.g., Safety and Health Awareness"
                invalid={Boolean(validationErrors.trainingTitle)}
                aria-invalid={Boolean(validationErrors.trainingTitle) || undefined}
                feedbackInvalid={validationErrors.trainingTitle}
                data-template-field="trainingTitle"
              />
            </CCol>
            <CCol md={2}>
              <TemplateFieldLabel htmlFor="training-template-code">
                Training code
              </TemplateFieldLabel>
              <CFormInput
                id="training-template-code"
                type="text"
                name="trainingCode"
                value={templateDetails.trainingCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase()
                  clearValidationError('trainingCode')
                  setTemplateDetails((prev) => ({ ...prev, trainingCode: val }))
                }}
                placeholder="e.g., SHOC"
                autoCapitalize="characters"
                style={{ textTransform: 'uppercase' }} // visual cue while typing
                invalid={Boolean(validationErrors.trainingCode)}
                aria-invalid={Boolean(validationErrors.trainingCode) || undefined}
                feedbackInvalid={validationErrors.trainingCode}
                data-template-field="trainingCode"
              />
            </CCol>

            <CCol md={3}>
              <TemplateFieldLabel htmlFor="training-template-hrd" optional>
                HRD program no.
              </TemplateFieldLabel>
              <CFormInput
                id="training-template-hrd"
                type="text"
                name="hrdNo"
                value={templateDetails.hrdNo}
                onChange={onInputChange}
                placeholder="e.g., 1000000... (Not the grant number)"
                invalid={Boolean(validationErrors.hrdNo)}
                aria-invalid={Boolean(validationErrors.hrdNo) || undefined}
                feedbackInvalid={validationErrors.hrdNo}
                data-template-field="hrdNo"
              />
            </CCol>
          </CRow>

          <TemplateSectionHeader
            title="Proposal content"
            description="Write the customer-facing introduction, outcomes, modules, and delivery method."
          />
          <MainBody
            templateDetails={templateDetails}
            setTemplateDetails={setTemplateDetails}
            handleEditorChange={onEditorChange}
            validationErrors={validationErrors}
          />

          <TemplateSectionHeader
            title="Training arrangements"
            description="Set the venue requirements, materials, language, duration, and tentative programme."
          />
          <TrainingRequirementsSection
            templateDetails={templateDetails}
            setTemplateDetails={setTemplateDetails}
            validationErrors={validationErrors}
          />

          <AgendaTable
            agendaRows={agendaRows}
            setAgendaRows={setAgendaRows}
            duration={templateDetails.duration}
            setDuration={(val) => {
              clearValidationError('duration')
              setTemplateDetails((prev) => ({ ...prev, duration: val }))
            }}
            validationErrors={validationErrors}
            clearAgendaValidationErrors={() => clearValidationErrorsByPrefix('agenda')}
          />

          <hr />

          <ProposalRemarks
            remarks={remarks}
            setRemarks={setRemarks}
            isEdit={isEdit}
            history={history}
            invalid={Boolean(validationErrors.remarks)}
            feedbackInvalid={validationErrors.remarks}
            onChange={() => clearValidationError('remarks')}
          />

          <TemplateFormActions
            isEdit={isEdit}
            saving={saving}
            finalizingBmTranslation={finalizingBmTranslation}
            onSecondary={isEdit ? onCancel : onReset}
            onSave={onSave}
            draftMessage={
              isEdit
                ? 'A new internal change note is required.'
                : 'Draft changes are saved locally on this device.'
            }
          />
        </>
      )}
    </>
  )
}

export default TrainingServiceTemplate
