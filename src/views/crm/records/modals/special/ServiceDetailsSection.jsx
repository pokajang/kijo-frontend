// crm/records/modals/special/ServiceDetailsSection.jsx
import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel } from '@coreui/react'

export default function ServiceDetailsSection({ formData }) {
  const { spId, serviceTitle, serviceCode, generalRemarks } = formData

  return (
    <>
      <CCardHeader>
        <strong>Service Details</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormLabel>Service Title / Code</CFormLabel>
            <br />
            {serviceTitle} <small className="text-muted">({serviceCode})</small>
          </CCol>
          <CCol md={6}>
            <CFormLabel>Template ID</CFormLabel>
            <br />
            {spId || 'N/A'}
          </CCol>
          <CCol md={12}>
            <CFormLabel>General Remarks</CFormLabel>
            <br />
            {generalRemarks || 'N/A'}
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}
