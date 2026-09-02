// src/templates/create/ManpowerServiceTemplate/Form.jsx
import React from 'react'
import { CForm, CRow, CCol, CFormInput } from '@coreui/react'
import EditorInput from '../../components/EditorInput'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import RemarksSection from './RemarksSection'
import TemplateDraftNotice from '../../shared/TemplateDraftNotice'
import TemplateFieldLabel from '../../shared/TemplateFieldLabel'
import TemplateFormActions from '../../shared/TemplateFormActions'
import TemplateSectionHeader from '../../shared/TemplateSectionHeader'
import TemplateOptionalEditors from '../../shared/TemplateOptionalEditors'

/**
 * The actual form UI for creating/updating a Manpower Template.
 * No <CCard> wrapper here--CreateTemplate.js handles that.
 */
export default function Form({
  isEdit,
  templateDetails,
  templateMeta,
  finalizingBmTranslation,
  handleEditorChange,
  remarks,
  setRemarks,
  history,
  saving,
  saveError,
  setSaveError,
  validationErrors,
  draftRestored,
  handleSave,
  clearValidationError,
  handleReset,
  handleCancel,
}) {
  const handleSecondaryAction = isEdit ? handleCancel : handleReset

  return (
    <CForm>
      <TemplateFormStatus saveError={saveError} onClearSaveError={() => setSaveError('')} />
      <BmDraftReviewNotice record={templateMeta} />
      <TemplateDraftNotice restored={draftRestored} />
      <TemplateSectionHeader
        title="Basic details"
        description="Name the reusable manpower service and provide its internal code."
      />
      {/* Service Title & Service Code */}
      <CRow className="mb-3">
        <CCol md={9}>
          <TemplateFieldLabel htmlFor="manpower-template-title">Service title</TemplateFieldLabel>
          <CFormInput
            id="manpower-template-title"
            type="text"
            value={templateDetails.serviceTitle || ''}
            onChange={(e) => handleEditorChange(e.target.value, 'serviceTitle')}
            placeholder="E.g., Safety and Health Officer"
            invalid={Boolean(validationErrors.serviceTitle)}
            aria-invalid={Boolean(validationErrors.serviceTitle) || undefined}
            feedbackInvalid={validationErrors.serviceTitle}
            data-template-field="serviceTitle"
          />
        </CCol>
        <CCol md={3}>
          <TemplateFieldLabel htmlFor="manpower-template-code">Service code</TemplateFieldLabel>
          <CFormInput
            id="manpower-template-code"
            type="text"
            value={templateDetails.serviceCode || ''}
            onChange={(e) => handleEditorChange(e.target.value, 'serviceCode')}
            placeholder="E.g., SHO"
            invalid={Boolean(validationErrors.serviceCode)}
            aria-invalid={Boolean(validationErrors.serviceCode) || undefined}
            feedbackInvalid={validationErrors.serviceCode}
            data-template-field="serviceCode"
          />
        </CCol>
      </CRow>

      <TemplateSectionHeader
        title="Proposal content"
        description="Complete the required service narrative and add optional supporting sections when needed."
      />
      {/* Introduction */}
      <EditorInput
        label="Introduction"
        required
        value={templateDetails.introduction}
        onChange={(content) => handleEditorChange(content, 'introduction')}
        field="introduction"
        invalid={Boolean(validationErrors.introduction)}
        feedbackInvalid={validationErrors.introduction}
      />

      {/* Service Deliverables */}
      <EditorInput
        label="Service Deliverables"
        required
        value={templateDetails.serviceDeliverables}
        onChange={(content) => handleEditorChange(content, 'serviceDeliverables')}
        field="serviceDeliverables"
        invalid={Boolean(validationErrors.serviceDeliverables)}
        feedbackInvalid={validationErrors.serviceDeliverables}
      />

      <TemplateOptionalEditors
        onChange={(content, field) => handleEditorChange(content, field)}
        items={[
          {
            label: 'Supplied manpower deliverables',
            field: 'suppliedManpowerDeliverables',
            value: templateDetails.suppliedManpowerDeliverables,
          },
          {
            label: 'Custom section',
            field: 'customSection',
            value: templateDetails.customSection || '',
          },
        ]}
      />

      {/* Remarks Section */}
      <RemarksSection
        isEdit={isEdit}
        history={history}
        remarks={remarks}
        setRemarks={setRemarks}
        invalid={Boolean(validationErrors.remarks)}
        feedbackInvalid={validationErrors.remarks}
        onChange={() => clearValidationError('remarks')}
      />

      {/* Action buttons */}
      <TemplateFormActions
        isEdit={isEdit}
        saving={saving}
        finalizingBmTranslation={finalizingBmTranslation}
        onSecondary={handleSecondaryAction}
        onSave={handleSave}
        draftMessage={
          isEdit
            ? 'A new internal change note is required.'
            : 'Draft changes are saved locally on this device.'
        }
      />
    </CForm>
  )
}
