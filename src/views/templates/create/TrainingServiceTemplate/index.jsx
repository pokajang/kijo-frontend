import React, { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CRow, CCol, CFormInput, CButton } from '@coreui/react'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import { getProposalListPath } from '../../proposals/proposalTabs'

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
  introduction: `e.g. This training is designed for...`,
  trainingCode: '',
  hrdNo: '',
  objectives: `Upon completion of the training, participants should be able to:
  <ol>
    <li>e.g. Identify, explain, describe, or demonstrate key safety principles effectively.</li>
    <li>etc.</li>
  </ol>`,
  modules: `Topics covered by this training include:
  <ol>
    <li>e.g. Introduction to OSHA 1994, Risk Matrix, Hazard Identification Techniques, Control Measures.</li>
    <li>etc.</li>
  </ol>`,
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

const TrainingServiceTemplate = ({ isEdit, editId }) => {
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
  const saveInFlightRef = useRef(false)

  // ------ wire up hooks
  useLoadDraft(isEdit, initialTemplateDetails, setTemplateDetails, setAgendaRows, setRemarks)
  useAutoSaveDraft(isEdit, templateDetails, agendaRows, remarks)
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
    })

  const onReset = () => {
    setValidationErrors({})
    setSaveError('')
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
          <CRow className="mb-3">
            <CCol md={7}>
              <label className="form-label">Training Title</label>
              <CFormInput
                type="text"
                name="trainingTitle"
                value={templateDetails.trainingTitle}
                onChange={onInputChange}
                placeholder="e.g., Safety and Health Awareness"
                invalid={Boolean(validationErrors.trainingTitle)}
                feedbackInvalid={validationErrors.trainingTitle}
                data-template-field="trainingTitle"
              />
            </CCol>
            <CCol md={2}>
              <label className="form-label">Training Code</label>
              <CFormInput
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
                feedbackInvalid={validationErrors.trainingCode}
                data-template-field="trainingCode"
              />
            </CCol>

            <CCol md={3}>
              <label className="form-label">HRD Program No.</label>
              <CFormInput
                type="text"
                name="hrdNo"
                value={templateDetails.hrdNo}
                onChange={onInputChange}
                placeholder="e.g., 1000000... (Not the grant number)"
                invalid={Boolean(validationErrors.hrdNo)}
                feedbackInvalid={validationErrors.hrdNo}
                data-template-field="hrdNo"
              />
            </CCol>
          </CRow>

          <MainBody
            templateDetails={templateDetails}
            setTemplateDetails={setTemplateDetails}
            handleEditorChange={onEditorChange}
            validationErrors={validationErrors}
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
            validationErrors={validationErrors}
            clearValidationError={clearValidationError}
          />

          <CRow className="mt-4">
            <CCol>
              <div className="d-flex gap-2">
                <CButton color="primary" onClick={onSave} disabled={saving}>
                  {saving
                    ? finalizingBmTranslation
                      ? 'Saving BM Proposal...'
                      : isEdit
                        ? 'Updating...'
                        : 'Saving...'
                    : finalizingBmTranslation
                      ? 'Save BM Proposal'
                      : isEdit
                        ? 'Update Changes'
                        : 'Save Template'}
                </CButton>

                {isEdit ? (
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate(location.state?.returnTo || returnPath)}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>
                ) : (
                  <CButton color="secondary" variant="outline" onClick={onReset} disabled={saving}>
                    Reset
                  </CButton>
                )}
              </div>
            </CCol>
          </CRow>
        </>
      )}
    </>
  )
}

export default TrainingServiceTemplate
