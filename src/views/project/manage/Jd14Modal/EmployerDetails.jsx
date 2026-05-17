import React from 'react'
import {
  CCardHeader,
  CCardBody,
  CForm,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
} from '@coreui/react'

const EmployerDetails = ({ employerDetails, employerCode, onChange }) => {
  return (
    <>
      <CCardHeader>
        <strong>Employer Details</strong>
      </CCardHeader>
      <CCardBody>
        <CForm>
          <CRow>
            {/* Row 1: Company Name (12) */}
            <CCol md={12}>
              <CFormLabel>Registered Name of Employer</CFormLabel>
              <CFormInput
                value={employerDetails.employerName}
                onChange={onChange('employerName')}
              />
            </CCol>

            {/* Row 2: Address (12) */}
            <CCol md={12} className="mt-3">
              <CFormLabel>Address</CFormLabel>
              <CFormTextarea
                rows={2}
                value={employerDetails.address}
                onChange={onChange('address')}
              />
            </CCol>

            {/* Row 3: Approval No (4), Employer Code (4), Group Approved (2), Group Claimed (2) */}
            <CCol md={4} className="mt-3">
              <CFormLabel>Approval No</CFormLabel>
              <CFormInput value={employerDetails.approvalNo} onChange={onChange('approvalNo')} />
            </CCol>
            <CCol md={4} className="mt-3">
              <CFormLabel>Employer Code</CFormLabel>
              <CFormInput value={employerCode} readOnly />
            </CCol>
            <CCol md={2} className="mt-3">
              <CFormLabel>Group Approved</CFormLabel>
              <CFormInput
                value={employerDetails.groupApproved}
                onChange={onChange('groupApproved')}
              />
            </CCol>
            <CCol md={2} className="mt-3">
              <CFormLabel>Group Claimed</CFormLabel>
              <CFormInput
                value={employerDetails.groupClaimed}
                onChange={onChange('groupClaimed')}
              />
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
    </>
  )
}

export default EmployerDetails
