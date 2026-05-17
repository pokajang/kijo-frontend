// /vendor/create/ContactDetailsForm.jsx

import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'

const ContactDetailsForm = ({ formData, handleChange }) => {
  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Vendor Contact Details</strong>
        </CCardHeader>
        <CCardBody>
          {/* Personal Contact Info */}
          <CRow className="g-3">
            <CCol md={3}>
              <CFormLabel htmlFor="contactPersonName">Contact Person</CFormLabel>
              <CFormInput
                name="contactPersonName"
                value={formData.contactPersonName}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={3}>
              <CFormLabel htmlFor="mobileNumber">Mobile Number</CFormLabel>
              <CFormInput
                type="number"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={3}>
              <CFormLabel htmlFor="email">Email</CFormLabel>
              <CFormInput
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={3}>
              <CFormLabel htmlFor="companyWebsite">Website</CFormLabel>
              <CFormInput
                type="text"
                name="companyWebsite"
                value={formData.companyWebsite}
                onChange={handleChange}
              />
            </CCol>
          </CRow>

          {/* Emergency Contact Info */}
          <CRow className="g-3 mt-2">
            <CCol md={4}>
              <CFormLabel htmlFor="emergencyContactName">Emergency Contact Name</CFormLabel>
              <CFormInput
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="emergencyRelationship">Relationship</CFormLabel>
              <CFormInput
                type="text"
                name="emergencyRelationship"
                value={formData.emergencyRelationship}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="emergencyMobileNumber">Emergency Contact Number</CFormLabel>
              <CFormInput
                type="number"
                name="emergencyMobileNumber"
                value={formData.emergencyMobileNumber}
                onChange={handleChange}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default ContactDetailsForm
