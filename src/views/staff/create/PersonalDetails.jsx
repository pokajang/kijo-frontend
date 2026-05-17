import React from 'react'
import { CCol, CFormLabel, CFormInput, CAlert } from '@coreui/react'

const PersonalDetails = ({
  staffDetails,
  setStaffDetails,
  nameCodeTaken,
  setNameCodeTaken,
  handleInputChange,
  handleNameCodeInputChange,
}) => (
  <>
    <CCol md={6}>
      <CFormLabel htmlFor="fullName">Full Name</CFormLabel>
      <CFormInput
        name="fullName"
        value={staffDetails.fullName}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
      />
    </CCol>

    <CCol md={2}>
      <CFormLabel htmlFor="nameCode">Name Code</CFormLabel>
      <CFormInput
        name="nameCode"
        value={staffDetails.nameCode}
        onChange={(e) => handleNameCodeInputChange(e, setStaffDetails, setNameCodeTaken)}
      />
      {nameCodeTaken && (
        <CAlert color="danger" className="mt-2">
          Choose another code.
        </CAlert>
      )}
    </CCol>

    <CCol md={4}>
      <CFormLabel htmlFor="email">Email</CFormLabel>
      <CFormInput
        type="email"
        name="email"
        value={staffDetails.email}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
      />
    </CCol>

    <CCol md={6}>
      <CFormLabel htmlFor="mobileNumber">Mobile Number</CFormLabel>
      <CFormInput
        name="mobileNumber"
        value={staffDetails.mobileNumber}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
      />
    </CCol>
  </>
)

export default PersonalDetails
