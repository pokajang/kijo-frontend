import React from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'

const GeneralInfoSection = ({ profile, onChange }) => (
  <>
    <CCardHeader>
      <strong>General Information</strong>
    </CCardHeader>
    <CCardBody>
      <CRow className="mb-2">
        <CCol md={6}>
          <CFormLabel htmlFor="fullName">Full Name</CFormLabel>
          <CFormInput
            type="text"
            id="fullName"
            name="fullName"
            value={profile.fullName || ''}
            onChange={onChange}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="email">Email</CFormLabel>
          <CFormInput
            type="email"
            id="email"
            name="email"
            value={profile.email || ''}
            // onChange={onChange}
            disabled
            readOnly
          />
        </CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol md={4}>
          <CFormLabel htmlFor="mobileNumber">Phone Number</CFormLabel>
          <CFormInput
            type="tel"
            id="mobileNumber"
            name="mobileNumber"
            value={profile.mobileNumber || ''}
            onChange={onChange}
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel htmlFor="birthDate">Date of Birth</CFormLabel>
          <CFormInput
            type="date"
            id="birthDate"
            name="birthDate"
            value={profile.birthDate || ''}
            onChange={onChange}
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel htmlFor="nric">IC Number</CFormLabel>
          <CFormInput
            type="text"
            id="nric"
            name="nric"
            value={profile.nric || ''}
            onChange={onChange}
          />
        </CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol>
          <CFormLabel htmlFor="currentAddress">Current Address</CFormLabel>
          <CFormTextarea
            id="currentAddress"
            name="currentAddress"
            rows={3}
            value={profile.currentAddress || ''}
            onChange={onChange}
          />
        </CCol>
      </CRow>
    </CCardBody>
  </>
)

export default GeneralInfoSection
