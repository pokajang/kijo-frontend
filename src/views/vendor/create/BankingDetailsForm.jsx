// /vendor/create/BankingDetailsForm.jsx

import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCardFooter,
  CFormInput,
  CFormLabel,
  CRow,
  CButton,
} from '@coreui/react'

const BankingDetailsForm = ({ formData, handleChange, handleSubmit, handleReset }) => {
  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Banking Details</strong>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={4}>
              <CFormLabel htmlFor="bankName">Bank Name</CFormLabel>
              <CFormInput name="bankName" value={formData.bankName} onChange={handleChange} />
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="bankAccountNumber">Bank Account Number</CFormLabel>
              <CFormInput
                type="number"
                name="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="bankHolderName">Bank Holder Name</CFormLabel>
              <CFormInput
                name="bankHolderName"
                value={formData.bankHolderName}
                onChange={handleChange}
              />
            </CCol>
          </CRow>
        </CCardBody>
        <CCardFooter className="d-flex justify-content-end gap-2">
          <CButton color="secondary" variant="outline" size="sm" onClick={handleReset}>
            Reset
          </CButton>
          <CButton color="primary" size="sm" onClick={handleSubmit}>
            Create Vendor
          </CButton>
        </CCardFooter>
      </CCard>
    </CCol>
  )
}

export default BankingDetailsForm
