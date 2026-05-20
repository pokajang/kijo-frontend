// shared/invoice/InvoiceDetails.jsx
import React from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
} from '@coreui/react'
import { getInvoicePaymentTermsSourceLabel, normalizePaymentTermsDays } from '../paymentTerms'

const InvoiceDetails = ({ form, handleChange, mode = 'create' }) => {
  const isCreate = mode === 'create'
  const overridePaymentTerms = Boolean(form.overridePaymentTerms)
  const source = overridePaymentTerms
    ? 'invoice_override'
    : form.paymentTermsSource || form.paymentTermsBaseSource || 'system_default'
  const termsDays = normalizePaymentTermsDays(form.paymentTermsDays)

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

        {/* Row 3: LOA/PO Number and Payment Terms */}
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
          <CCol md={6}>
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <CFormLabel className="mb-0">Payment Terms</CFormLabel>
              <CFormCheck
                id="overridePaymentTerms"
                name="overridePaymentTerms"
                label="Override for this invoice"
                checked={overridePaymentTerms}
                onChange={handleChange}
              />
            </div>
            <CFormInput
              className="mt-2"
              type="number"
              min="0"
              max="365"
              name="paymentTermsDays"
              value={termsDays}
              onChange={handleChange}
              disabled={!overridePaymentTerms}
            />
            <small className="text-muted d-block mt-1">
              {getInvoicePaymentTermsSourceLabel(source, termsDays)}
            </small>
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default InvoiceDetails
