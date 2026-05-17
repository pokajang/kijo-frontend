// shared/invoice/InvoiceDetails.jsx
import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel, CFormInput } from '@coreui/react'

const InvoiceDetails = ({ form, handleChange, mode = 'create' }) => {
  const isCreate = mode === 'create'
  return (
    <>
      <CCardHeader>
        <strong>Invoice Details</strong>
      </CCardHeader>
      <CCardBody>
        {/* Row 1: Ref No & Purpose */}
        <CRow className="mb-2">
          <CCol md={6}>
            <CFormLabel>Invoice Ref No.</CFormLabel>
            <CFormInput value={form.invoiceRef || ''} disabled />
          </CCol>
          <CCol md={6}>
            <CFormLabel>Purpose</CFormLabel>
            <CFormInput
              name="purpose"
              value={form.purpose || ''}
              onChange={handleChange}
              disabled={isCreate}
            />
          </CCol>
        </CRow>

        {/* Row 2: Date, Status, Service Type */}
        <CRow className="mb-2">
          <CCol md={4}>
            <CFormLabel>Date Issued</CFormLabel>
            <CFormInput
              type="date"
              name="dateIssued"
              value={form.dateIssued || ''}
              onChange={handleChange}
              disabled={isCreate}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Status</CFormLabel>
            <CFormInput
              name="status"
              value={form.status || ''}
              onChange={handleChange}
              disabled={isCreate}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Service Type</CFormLabel>
            <CFormInput value={form.serviceType || ''} disabled />
          </CCol>
        </CRow>

        {/* Row 3: LOA/PO Number */}
        <CRow className="mb-2">
          <CCol md={6}>
            <CFormLabel>LOA / PO Ref.</CFormLabel>
            <CFormInput
              name="loaNo"
              value={form.loaNo || ''}
              onChange={handleChange}
              disabled={isCreate}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default InvoiceDetails
