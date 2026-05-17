// RemarksAndTravelCard.jsx
import React from 'react'
import { CRow, CCol, CFormLabel, CFormInput, CFormTextarea } from '@coreui/react'

const RemarksAndTravelCard = ({ formData, setFormData }) => {
  return (
    <CRow className="g-3">
      <CCol md={6}>
        <CFormLabel>Remarks / Additional Address</CFormLabel>
        <CFormTextarea
          name="inquiryRemarks"
          rows={2}
          value={formData.inquiryRemarks}
          onChange={(e) => setFormData((prev) => ({ ...prev, inquiryRemarks: e.target.value }))}
          placeholder="E.g. Pahang Branch - 30 chemicals, Penang Branch - 2 chemicals"
        />
      </CCol>
    </CRow>
  )
}

export default RemarksAndTravelCard
