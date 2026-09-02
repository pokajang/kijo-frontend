import React from 'react'
import { CRow, CCol, CFormInput } from '@coreui/react'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'

import Sections from './Sections'
import RemarksSection from './RemarksSection'
import TemplateDraftNotice from '../../shared/TemplateDraftNotice'
import TemplateFieldLabel from '../../shared/TemplateFieldLabel'
import TemplateFormActions from '../../shared/TemplateFormActions'
import TemplateSectionHeader from '../../shared/TemplateSectionHeader'

const Form = ({
  isEdit,
  templateDetails,
  templateMeta,
  finalizingBmTranslation,
  setTemplateDetails,
  remarks,
  setRemarks,
  history,
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
}) => {
  return (
    <>
      <TemplateFormStatus saveError={saveError} onClearSaveError={() => setSaveError('')} />
      <BmDraftReviewNotice record={templateMeta} />
      <TemplateDraftNotice restored={draftRestored} />
      <TemplateSectionHeader
        title="Basic details"
        description="Name the reusable industrial hygiene service and provide its internal code."
      />
      {/* Proposal Title */}
      <CRow className="mb-3">
        <CCol md={9}>
          <TemplateFieldLabel htmlFor="ih-template-title">Service title</TemplateFieldLabel>
          <CFormInput
            id="ih-template-title"
            type="text"
            name="serviceTitle"
            value={templateDetails.serviceTitle}
            onChange={handleInputChange}
            placeholder="e.g., Chemical Health Risk Assessment"
            invalid={Boolean(validationErrors.serviceTitle)}
            aria-invalid={Boolean(validationErrors.serviceTitle) || undefined}
            feedbackInvalid={validationErrors.serviceTitle}
            data-template-field="serviceTitle"
          />
        </CCol>
        <CCol md={3}>
          <TemplateFieldLabel htmlFor="ih-template-code">Service code</TemplateFieldLabel>
          <CFormInput
            id="ih-template-code"
            type="text"
            name="serviceCode"
            value={templateDetails.serviceCode}
            onChange={handleInputChange}
            placeholder="e.g., CHRA"
            invalid={Boolean(validationErrors.serviceCode)}
            aria-invalid={Boolean(validationErrors.serviceCode) || undefined}
            feedbackInvalid={validationErrors.serviceCode}
            data-template-field="serviceCode"
          />
        </CCol>
      </CRow>

      <TemplateSectionHeader
        title="Proposal content"
        description="Complete the required introduction and any other sections needed for this service."
      />
      {/* All Editor Sections */}
      <Sections
        templateDetails={templateDetails}
        handleEditorChange={handleEditorChange}
        validationErrors={validationErrors}
      />

      {/* Remarks Section */}
      <RemarksSection
        remarks={remarks}
        setRemarks={setRemarks}
        isEdit={isEdit}
        history={history}
        invalid={Boolean(validationErrors.remarks)}
        feedbackInvalid={validationErrors.remarks}
        onChange={() => clearValidationError('remarks')}
      />

      {/* Action Buttons */}
      <TemplateFormActions
        isEdit={isEdit}
        saving={saving}
        finalizingBmTranslation={finalizingBmTranslation}
        onSecondary={isEdit ? handleCancel : handleReset}
        onSave={handleSave}
        draftMessage={
          isEdit
            ? 'A new internal change note is required.'
            : 'Draft changes are saved locally on this device.'
        }
      />
    </>
  )
}

export default Form
