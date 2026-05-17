// src/templates/create/ManpowerServiceTemplate/Form.jsx
import React from 'react'
import { CForm, CRow, CCol, CButton, CFormLabel, CFormInput } from '@coreui/react'
import EditorInput from '../../components/EditorInput'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import RemarksSection from './RemarksSection'

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
  handleSave,
  handleReset,
  handleCancel,
}) {
  const handleSecondaryAction = isEdit ? handleCancel : handleReset

  return (
    <CForm>
      <TemplateFormStatus saveError={saveError} onClearSaveError={() => setSaveError('')} />
      <BmDraftReviewNotice record={templateMeta} />
      {/* Service Title & Service Code */}
      <CRow className="mb-3">
        <CCol xs={9}>
          <CFormLabel>Service Title</CFormLabel>
          <CFormInput
            type="text"
            value={templateDetails.serviceTitle || ''}
            onChange={(e) => handleEditorChange(e.target.value, 'serviceTitle')}
            placeholder="E.g., Safety and Health Officer"
          />
        </CCol>
        <CCol xs={3}>
          <CFormLabel>Service Code</CFormLabel>
          <CFormInput
            type="text"
            value={templateDetails.serviceCode || ''}
            onChange={(e) => handleEditorChange(e.target.value, 'serviceCode')}
            placeholder="E.g., SHO"
          />
        </CCol>
      </CRow>

      {/* Introduction */}
      <EditorInput
        label="Introduction"
        value={templateDetails.introduction}
        onChange={(content) => handleEditorChange(content, 'introduction')}
      />

      {/* Service Deliverables */}
      <EditorInput
        label="Service Deliverables"
        value={templateDetails.serviceDeliverables}
        onChange={(content) => handleEditorChange(content, 'serviceDeliverables')}
      />

      {/* Supplied Manpower Deliverables */}
      <EditorInput
        label="Supplied Manpower Deliverables"
        value={templateDetails.suppliedManpowerDeliverables}
        onChange={(content) => handleEditorChange(content, 'suppliedManpowerDeliverables')}
      />

      {/* Custom Section */}
      <EditorInput
        label="Custom Section"
        value={templateDetails.customSection || ''}
        onChange={(content) => handleEditorChange(content, 'customSection')}
      />

      {/* Remarks Section */}
      <RemarksSection isEdit={isEdit} history={history} remarks={remarks} setRemarks={setRemarks} />

      {/* Action buttons */}
      <CRow className="mt-4">
        <CCol>
          <CButton color="primary" onClick={handleSave} disabled={saving}>
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
          <CButton
            variant="outline"
            color="secondary"
            className="ms-2"
            onClick={handleSecondaryAction}
            disabled={saving}
          >
            {isEdit ? 'Cancel' : 'Reset'}
          </CButton>
        </CCol>
      </CRow>
    </CForm>
  )
}
