// shared/invoice/PaymentDetails.jsx
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

const PaymentDetails = ({ form, handleChange, mode = 'create' }) => {
  const isCreate = mode === 'create'
  return (
    <>
      <CCardHeader>
        <strong>Payment Details</strong>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol md={4}>
            <CFormLabel>Paid Date</CFormLabel>
            <CFormInput
              type="date"
              name="paidDate"
              value={form.paidDate || ''}
              onChange={handleChange}
              disabled={isCreate}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Paid Amount (RM)</CFormLabel>
            <CFormInput
              type="number"
              name="paidAmount"
              value={form.paidAmount || ''}
              onChange={handleChange}
              disabled={isCreate}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Paid Remarks</CFormLabel>
            <CFormTextarea
              rows={1}
              name="paidRemarks"
              value={form.paidRemarks || ''}
              onChange={handleChange}
              placeholder="e.g. Bank Transfer"
              disabled={isCreate}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default PaymentDetails
