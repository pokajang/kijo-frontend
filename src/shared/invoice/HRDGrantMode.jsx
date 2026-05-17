import React from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CFormLabel, CFormInput } from '@coreui/react'

const HRDGrantMode = ({ quoteDetails, grantApprovalNo, onChange, paymentMethod }) => {
  const normalized = String(paymentMethod || quoteDetails?.payment_method || '')
    .trim()
    .toLowerCase()
  if (normalized !== 'hrd grant') return null

  return (
    <>
      <CCardHeader>
        <strong>HRD Grant No.</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>HRD Grant Approval Number</CFormLabel>
            <CFormInput
              type="text"
              name="grantApprovalNo"
              value={grantApprovalNo || ''}
              onChange={onChange}
              placeholder="e.g. HRDF123456"
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default HRDGrantMode
