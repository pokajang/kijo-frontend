// src/views/feedback/FeedbackForm.jsx

import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CAlert,
  CForm,
  CFormTextarea,
  CButton,
} from '@coreui/react'

const FeedbackForm = ({ feedback, setFeedback, onSubmit, onCancel }) => {
  return (
    <CCard>
      <CCardHeader>
        <strong>Share Your Feedback</strong>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol>
            <CAlert color="primary" dismissible>
              <strong>
                When using this platform, share your challenges, difficulties, or request new
                features to improve our workflows.
              </strong>
            </CAlert>
          </CCol>
        </CRow>
        <CRow>
          <CCol>
            <CForm>
              <CFormTextarea
                rows="4"
                placeholder="Enter your feedback here."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </CForm>
          </CCol>
        </CRow>
        <CRow className="mt-3">
          <CCol className="d-flex gap-2">
            <CButton onClick={onSubmit} color="primary">
              Submit
            </CButton>
            <CButton onClick={onCancel} color="secondary">
              Cancel
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default FeedbackForm
