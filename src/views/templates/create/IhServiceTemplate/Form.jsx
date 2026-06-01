import React from 'react'
import { CRow, CCol, CFormInput, CButton } from '@coreui/react'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'

import Sections from './Sections'
import RemarksSection from './RemarksSection'

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
  handleInputChange,
  handleEditorChange,
  handleSave,
  handleReset,
  handleCancel,
}) => {
  return (
    <>
      <TemplateFormStatus saveError={saveError} onClearSaveError={() => setSaveError('')} />
      <BmDraftReviewNotice record={templateMeta} />
      {/* Proposal Title */}
      <CRow className="mb-3">
        <CCol md={9}>
          <label className="form-label">Service Title</label>
          <CFormInput
            type="text"
            name="serviceTitle"
            value={templateDetails.serviceTitle}
            onChange={handleInputChange}
            placeholder="e.g., Chemical Health Risk Assessment"
          />
        </CCol>
        <CCol md={3}>
          <label className="form-label">Service Code</label>
          <CFormInput
            type="text"
            name="serviceCode"
            value={templateDetails.serviceCode}
            onChange={handleInputChange}
            placeholder="e.g., CHRA"
          />
        </CCol>
      </CRow>

      {/* All Editor Sections */}
      <Sections templateDetails={templateDetails} handleEditorChange={handleEditorChange} />

      {/* Remarks Section */}
      <RemarksSection remarks={remarks} setRemarks={setRemarks} isEdit={isEdit} history={history} />

      {/* Action Buttons */}
      <CRow className="mt-4">
        <CCol>
          <div className="d-flex justify-content-end gap-2">
            {isEdit ? (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </CButton>
            ) : (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </CButton>
            )}
            <CButton color="primary" size="sm" onClick={handleSave} disabled={saving}>
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
          </div>
        </CCol>
      </CRow>
    </>
  )
}

export default Form
