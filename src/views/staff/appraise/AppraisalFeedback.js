import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'
import StaffSelector from './StaffSelector'
import { createAppraisalRecord, handleInputChange } from './actionHandlers'
import infoDetails from './infoDetails'
import dialog from '../../../components/dialog/dialogService'

const feedbackTypes = ['Positive Observation', 'Outstanding Achievement', 'Areas for Improvement']

const AppraisalFeedback = ({ onBack }) => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [formData, setFormData] = useState({
    selectedStaff: '',
    section: feedbackTypes[0],
    eventDate: new Date().toISOString().slice(0, 10),
    quickInput: '',
  })

  const goBack = onBack || (() => navigate('/staff/appraise'))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (
      !formData.selectedStaff ||
      !formData.section ||
      !formData.eventDate ||
      !formData.quickInput
    ) {
      dialog.alert('Please select staff, feedback type, event date, and feedback.')
      return
    }

    const confirmed = await dialog.confirm(
      `Submit ${formData.section} for staff ID ${formData.selectedStaff}?`,
    )
    if (!confirmed) return

    try {
      setSubmitting(true)
      await createAppraisalRecord({
        section: formData.section,
        staffId: formData.selectedStaff,
        eventDate: formData.eventDate,
        input: formData.quickInput,
      })
      dialog.alert('Appraisal feedback submitted successfully.')
      goBack()
    } catch (err) {
      dialog.alert(err?.message || 'Failed to submit appraisal feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>Add Appraisal Feedback</strong>
          <CButton color="secondary" variant="outline" size="sm" onClick={goBack}>
            Back
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol xs={12} md={6}>
                <CFormLabel>Staff Name</CFormLabel>
                <StaffSelector
                  name="selectedStaff"
                  value={formData.selectedStaff}
                  onChange={(event) => handleInputChange(event, setFormData)}
                />
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel
                  htmlFor="section"
                  className="d-flex align-items-center justify-content-between gap-2"
                >
                  <span>Feedback Type</span>
                  <CButton
                    color="link"
                    className="p-0"
                    style={{ lineHeight: 1 }}
                    disabled={!infoDetails[formData.section]}
                    aria-label={`View ${formData.section} guidance`}
                    title="View guidance"
                    onClick={() => setShowInfoModal(true)}
                  >
                    <CIcon icon={cilInfo} size="lg" />
                  </CButton>
                </CFormLabel>
                <CFormSelect
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={(event) => handleInputChange(event, setFormData)}
                >
                  {feedbackTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel htmlFor="eventDate">Event Date</CFormLabel>
                <CFormInput
                  type="date"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={(event) => handleInputChange(event, setFormData)}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="quickInput">Feedback</CFormLabel>
                <CFormTextarea
                  id="quickInput"
                  name="quickInput"
                  rows={5}
                  value={formData.quickInput}
                  onChange={(event) => handleInputChange(event, setFormData)}
                  placeholder={`Enter details for ${formData.section}`}
                />
              </CCol>
              <CCol xs={12}>
                <CButton type="submit" color="primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>

      <CModal
        alignment="center"
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        size="lg"
        scrollable
      >
        <CModalHeader closeButton>
          <CModalTitle>{formData.section} Guidance</CModalTitle>
        </CModalHeader>
        <CModalBody>{infoDetails[formData.section]}</CModalBody>
      </CModal>
    </>
  )
}

export default AppraisalFeedback
