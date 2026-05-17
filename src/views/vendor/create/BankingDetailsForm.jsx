// /vendor/create/BankingDetailsForm.jsx

import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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

          <CRow className="mt-4">
            <CCol xs={12}>
              <CButton color="primary" onClick={handleSubmit} className="me-2">
                Create Vendor
              </CButton>
              <CButton color="secondary" onClick={handleReset}>
                Cancel
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default BankingDetailsForm
