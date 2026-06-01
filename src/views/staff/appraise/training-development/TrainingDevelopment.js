import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
} from '@coreui/react'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const TrainingDevelopment = () => {
  const [formData, setFormData] = useState({
    staffName: '',
    nric: '',
    trainingTopic: '',
    trainingDescription: '',
    preferredDate: null,
    trainingProvider: '',
    additionalRemarks: '',
  })

  // constant for navigatio
  const navigate = useNavigate()

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prevData) => ({ ...prevData, [name]: value }))
  }

  // Handle specific react datepicker
  const handleDateChange = (date) => {
    setFormData((prevData) => ({ ...prevData, preferredDate: date }))
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Training Request Submitted:', formData)
    // Future integration: send formData to the backend API or database.
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Training &amp; Development Request</strong>
      </CCardHeader>
      <CCardBody>
        <CForm onSubmit={handleSubmit}>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="staffName">Staff Name</CFormLabel>
                <CFormInput
                  type="text"
                  id="staffName"
                  name="staffName"
                  value={formData.staffName}
                  onChange={handleInputChange}
                />
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="nric">NRIC</CFormLabel>
                <CFormInput
                  type="text"
                  id="nric"
                  name="nric"
                  value={formData.nric}
                  onChange={handleInputChange}
                />
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="trainingTopic">Training Topic</CFormLabel>
                <CFormInput
                  type="text"
                  id="trainingTopic"
                  name="trainingTopic"
                  value={formData.trainingTopic}
                  onChange={handleInputChange}
                />
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="preferredDate">Preferred Date</CFormLabel>
                <CRow>
                  <DatePicker
                    selected={formData.preferredDate}
                    onChange={handleDateChange}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select a date"
                    className="form-control"
                    id="preferredDate"
                    name="preferredDate"
                  />
                </CRow>
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel htmlFor="trainingDescription">Training Description</CFormLabel>
                <CFormTextarea
                  id="trainingDescription"
                  name="trainingDescription"
                  value={formData.trainingDescription}
                  onChange={handleInputChange}
                  placeholder="Provide a detailed description of the training requirement"
                  rows={3}
                />
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="trainingProvider">Training Provider</CFormLabel>
                <CFormInput
                  type="text"
                  id="trainingProvider"
                  name="trainingProvider"
                  value={formData.trainingProvider}
                  onChange={handleInputChange}
                />
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="additionalRemarks">Additional Remarks</CFormLabel>
                <CFormTextarea
                  id="additionalRemarks"
                  name="additionalRemarks"
                  value={formData.additionalRemarks}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>
            </CCol>
          </CRow>
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate(-1)}>
              Back
            </CButton>
            <CButton type="submit" color="primary" size="sm" onClick={handleSubmit}>
              Submit Request
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default TrainingDevelopment
