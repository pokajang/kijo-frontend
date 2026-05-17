// crm/records/modals/special/ClientDetailsSection.jsx
import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel } from '@coreui/react'

export default function ClientDetailsSection({ clientDetails }) {
  const { companyName, ssmNumber, address, city, state, zip, fullName, mobileNumber, email } =
    clientDetails

  return (
    <>
      <CCardHeader>
        <strong>Client Details</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={4}>
            <CFormLabel>Company Name</CFormLabel>
            <br />
            {companyName}
          </CCol>
          <CCol md={4}>
            <CFormLabel>SSM Number</CFormLabel>
            <br />
            {ssmNumber}
          </CCol>
          <CCol md={4}>
            <CFormLabel>Address</CFormLabel>
            <br />
            {address}
            <br />
            {city}, {state} {zip}
          </CCol>
          <CCol md={4}>
            <CFormLabel>PIC Name</CFormLabel>
            <br />
            {fullName}
          </CCol>
          <CCol md={4}>
            <CFormLabel>Mobile</CFormLabel>
            <br />
            {mobileNumber}
          </CCol>
          <CCol md={4}>
            <CFormLabel>Email</CFormLabel>
            <br />
            {email}
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}
