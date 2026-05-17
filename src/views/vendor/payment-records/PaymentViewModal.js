import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CFormCheck,
  CFormLabel,
} from '@coreui/react'
import { resolveAssetUrl } from '../../../utils/assetUrls'

const PaymentViewModal = ({ visible, onClose, payment }) => {
  const [seeInvoice, setSeeInvoice] = useState(false)

  if (!payment) return null
  const receiptUrl = resolveAssetUrl(payment.receipt_url || payment.receipt_path)

  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center" scrollable>
      <CModalHeader>
        <CModalTitle>Payment Details</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>General Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={3}>
                <CFormLabel>Created At</CFormLabel>
                <p>{payment.created_at?.split(' ')[0]}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Created By</CFormLabel>
                <p>{payment.created_by_name_code || '-'}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Approved At</CFormLabel>
                <p>{payment.date_approved?.split(' ')[0] || 'Pending'}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Approved By</CFormLabel>
                <p>{payment.approved_by || '-'}</p>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Payment Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={3}>
                <CFormLabel>Vendor ID</CFormLabel>
                <p>{payment.vendor_id}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Vendor Name</CFormLabel>
                <p>{payment.vendor_name || '-'}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Amount</CFormLabel>
                <p>RM {Number(payment.amount).toFixed(2)}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Status</CFormLabel>
                <p>{payment.status}</p>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Payment Type</CFormLabel>
                <p>{payment.payment_type || '-'}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Method</CFormLabel>
                <p>{payment.method || '-'}</p>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Context Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Project ID</CFormLabel>
                <p>{payment.project_id || 'N/A'}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Context</CFormLabel>
                <p>{payment.payment_context || '-'}</p>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Remarks</CFormLabel>
                <p>{payment.remarks || 'Not provided'}</p>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Vendor Invoice</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormCheck
                  label="View invoice here"
                  checked={seeInvoice}
                  onChange={(e) => setSeeInvoice(e.target.checked)}
                />
              </CCol>
            </CRow>
            {seeInvoice && receiptUrl && (
              <CRow>
                <CCol md={12}>
                  <iframe
                    src={receiptUrl}
                    title="Receipt"
                    style={{
                      width: '100%',
                      height: '500px',
                      border: '1px solid var(--app-border-card)',
                    }}
                  />
                </CCol>
              </CRow>
            )}
          </CCardBody>
        </CCard>
      </CModalBody>
    </CModal>
  )
}

export default PaymentViewModal
