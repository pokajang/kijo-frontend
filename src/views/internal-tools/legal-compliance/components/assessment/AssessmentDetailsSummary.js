import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CFormLabel, CRow } from '@coreui/react'
import { displayValue } from '../../utils/formatters'

const AssessmentDetailsSummary = ({ assessmentDetails, actions }) => (
  <CCard>
    <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
      <strong>Assessment Details</strong>
      {actions && <div className="d-flex justify-content-end gap-2 flex-wrap">{actions}</div>}
    </CCardHeader>
    <CCardBody>
      <CRow className="g-3">
        <CCol md={6} lg={4}>
          <CFormLabel>Company</CFormLabel>
          <div>{displayValue(assessmentDetails.companyName)}</div>
        </CCol>
        <CCol md={6} lg={4}>
          <CFormLabel>Address</CFormLabel>
          <div>{displayValue(assessmentDetails.siteLocation)}</div>
        </CCol>
        <CCol md={6} lg={4}>
          <CFormLabel>Assessment Date</CFormLabel>
          <div>{displayValue(assessmentDetails.assessmentDate)}</div>
        </CCol>
        <CCol md={6} lg={4}>
          <CFormLabel>Client PIC Name</CFormLabel>
          <div>{displayValue(assessmentDetails.clientPicName)}</div>
        </CCol>
        <CCol md={6} lg={4}>
          <CFormLabel>Client PIC Email</CFormLabel>
          <div>{displayValue(assessmentDetails.clientPicEmail)}</div>
        </CCol>
        <CCol md={6} lg={4}>
          <CFormLabel>Nature of Company</CFormLabel>
          <div style={{ whiteSpace: 'pre-line' }}>
            {displayValue(assessmentDetails.scopeRemarks)}
          </div>
        </CCol>
        {assessmentDetails.projectName && (
          <CCol md={6} lg={4}>
            <CFormLabel>Project</CFormLabel>
            <div>{displayValue(assessmentDetails.projectName)}</div>
          </CCol>
        )}
      </CRow>
    </CCardBody>
  </CCard>
)

export default AssessmentDetailsSummary
