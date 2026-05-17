// src/views/project/InvoiceProjectModal/ClientDetails.jsx
import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel, CFormInput } from '@coreui/react'

const ClientDetails = ({
  form,
  handleChange,
  showPaymentMethod = false,
  paymentMethod = '',
  onPaymentMethodChange,
}) => {
  const normalizedPaymentMethod = String(paymentMethod || '')
    .trim()
    .toLowerCase()
  const isHrdPayment = normalizedPaymentMethod === 'hrd grant'
  const isDirectPayment =
    normalizedPaymentMethod === 'direct payment' ||
    (normalizedPaymentMethod !== '' && !isHrdPayment)

  return (
    <>
      <CCardHeader>
        <strong>Invoice To</strong>
      </CCardHeader>
      <CCardBody>
        {showPaymentMethod && (
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Payment Method</CFormLabel>
            <div className="d-flex gap-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payment_method"
                  id="payment-direct"
                  value="direct payment"
                  checked={isDirectPayment}
                  onChange={() => onPaymentMethodChange?.('direct payment')}
                />
                <label className="form-check-label" htmlFor="payment-direct">
                  Direct Payment
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payment_method"
                  id="payment-hrd"
                  value="hrd grant"
                  checked={isHrdPayment}
                  onChange={() => onPaymentMethodChange?.('hrd grant')}
                />
                <label className="form-check-label" htmlFor="payment-hrd">
                  HRD Grant
                </label>
              </div>
            </div>
          </div>
        )}
        {/* Company name & full address */}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>Company Name</CFormLabel>
            <CFormInput name="clientName" value={form.clientName} onChange={handleChange} />
          </CCol>
          <CCol md={6}>
            <CFormLabel>Company Address</CFormLabel>
            <CFormInput name="clientAddress" value={form.clientAddress} onChange={handleChange} />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>SSM No.</CFormLabel>
            <CFormInput name="clientSSM" value={form.clientSSM} onChange={handleChange} />
          </CCol>
          <CCol md={6}>
            <CFormLabel>TIN No.</CFormLabel>
            <CFormInput name="clientTIN" value={form.clientTIN || ''} onChange={handleChange} />
          </CCol>
        </CRow>

        {/* City / State / ZIP */}
        <CRow className="mb-3">
          <CCol md={4}>
            <CFormLabel>City</CFormLabel>
            <CFormInput name="clientCity" value={form.clientCity} onChange={handleChange} />
          </CCol>
          <CCol md={4}>
            <CFormLabel>State</CFormLabel>
            <CFormInput name="clientState" value={form.clientState} onChange={handleChange} />
          </CCol>
          <CCol md={4}>
            <CFormLabel>ZIP</CFormLabel>
            <CFormInput name="clientZip" value={form.clientZip} onChange={handleChange} />
          </CCol>
        </CRow>

        {/* PIC contact */}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>PIC Name</CFormLabel>
            <CFormInput name="picName" value={form.picName} onChange={handleChange} />
          </CCol>
          <CCol md={6}>
            <CFormLabel>PIC Email</CFormLabel>
            <CFormInput name="picEmail" value={form.picEmail} onChange={handleChange} />
          </CCol>
        </CRow>
        <CRow>
          <CCol md={6}>
            <CFormLabel>PIC Mobile</CFormLabel>
            <CFormInput name="picPhone" value={form.picPhone} onChange={handleChange} />
          </CCol>
          <CCol md={6}>
            <CFormLabel>PIC Position</CFormLabel>
            <CFormInput name="picPosition" value={form.picPosition} onChange={handleChange} />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default ClientDetails
