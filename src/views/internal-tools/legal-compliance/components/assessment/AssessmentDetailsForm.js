import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'

const AssessmentDetailsForm = ({
  assessmentDetails,
  isSavingAssessment,
  onSubmit,
  onBack,
  onReset,
  onAssessmentChange,
}) => (
  <CForm onSubmit={onSubmit}>
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
            <strong>Assessment Details</strong>
            <CButton
              type="button"
              color="secondary"
              size="sm"
              variant="outline"
              onClick={onBack}
              disabled={isSavingAssessment}
            >
              Back
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6} lg={3}>
                <CFormLabel htmlFor="assessmentDate">Assessment Date</CFormLabel>
                <CFormInput
                  id="assessmentDate"
                  type="date"
                  value={assessmentDetails.assessmentDate}
                  onChange={(event) => onAssessmentChange('assessmentDate', event.target.value)}
                />
              </CCol>
              <CCol md={6} lg={9}>
                <CFormLabel htmlFor="scopeRemarks">Nature of Company</CFormLabel>
                <CFormTextarea
                  id="scopeRemarks"
                  rows={1}
                  value={assessmentDetails.scopeRemarks}
                  onChange={(event) => onAssessmentChange('scopeRemarks', event.target.value)}
                  placeholder="Enter nature of company"
                />
              </CCol>
            </CRow>
            <div className="d-flex justify-content-end gap-2 flex-wrap mt-3">
              <CButton
                type="button"
                color="danger"
                size="sm"
                variant="outline"
                onClick={onReset}
                disabled={isSavingAssessment}
              >
                Reset
              </CButton>
              <CButton type="submit" color="primary" size="sm" disabled={isSavingAssessment}>
                {isSavingAssessment ? 'Saving...' : 'Save Assessment Draft'}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </CForm>
)

export default AssessmentDetailsForm
