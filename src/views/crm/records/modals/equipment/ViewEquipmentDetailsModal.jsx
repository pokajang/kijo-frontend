// src/views/crm/records/modals/equipment/ViewEquipmentDetailsModal.jsx

import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'

/**
 * Modal for viewing Equipment Supply quotation details
 */
export default function ViewEquipmentDetailsModal({ visible, record, onClose }) {
  if (!visible || !record) return null
  // Top‐level fields
  const {
    quotationId,
    dateCreated,
    revisionNo,
    dateUpdated,
    status,
    awardDate,
    clientLoaRefNo,
    createdById,
    createdByName,
    createdByCode,
    attachProposal,
    clientDetails,
    formData,
    discount,
    deliveryCharge,
    miscCharge,
    sstPercent,
    sstAmount,
    subtotal,
    grandTotal,
    lineItems = [],
  } = record

  const { inquiryRemarks } = formData

  return (
    <CModal
      alignment="center"
      scrollable
      size="xl"
      visible={visible}
      onClose={onClose}
      backdrop="static"
    >
      <CModalHeader closeButton>
        <CModalTitle>Equipment Quotation Details</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          {/* Quote Metadata */}
          <CCardHeader>
            <strong>Quotation Metadata</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Quotation No.</CFormLabel>
                <br />
                {quotationId}
                {revisionNo > 0 && <span className="text-muted ms-1">(Rev0{revisionNo})</span>}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Date Created</CFormLabel>
                <br />
                {dateCreated.split(' ')[0]}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Date Revised</CFormLabel>
                <br />
                {dateUpdated.split(' ')[0]}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Status</CFormLabel>
                <br />
                {status} {awardDate || ''}
              </CCol>
              <CCol md={4}>
                <CFormLabel>LOA / PO Ref. No.</CFormLabel>
                <br />
                {clientLoaRefNo || 'N/A'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Created By (ID)</CFormLabel>
                <br />
                {createdById}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Created By (Name / Code)</CFormLabel>
                <br />
                {createdByName} ({createdByCode})
              </CCol>
            </CRow>
          </CCardBody>

          {/* Client Details */}
          <CCardHeader>
            <strong>Client Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Company Name</CFormLabel>
                <br />
                {clientDetails.companyName}
              </CCol>
              <CCol md={4}>
                <CFormLabel>SSM Number</CFormLabel>
                <br />
                {clientDetails.ssmNumber}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Address</CFormLabel>
                <br />
                {clientDetails.address}
                <br />
                {clientDetails.city}, {clientDetails.state} {clientDetails.zip}
              </CCol>
              <CCol md={4}>
                <CFormLabel>PIC Name</CFormLabel>
                <br />
                {clientDetails.fullName}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Mobile</CFormLabel>
                <br />
                {clientDetails.mobileNumber}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Email</CFormLabel>
                <br />
                {clientDetails.email}
              </CCol>
            </CRow>
          </CCardBody>

          {/* Project + Pricing Details */}
          <CCardHeader>
            <strong>Project Details & Pricing Summary</strong>
          </CCardHeader>
          <CCardBody>
            {/* unchanged: your inquiry remarks */}
            <CFormLabel>Inquiry Remarks</CFormLabel>
            <br />
            {inquiryRemarks || 'N/A'}

            {/* combined table */}
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover responsive className="mt-3 data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Item</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell>Unit</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Unit Price</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Marked-Up</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {/* — your line items as before — */}
                {lineItems.map((it, idx) => (
                  <CTableRow key={idx}>
                    <CTableHeaderCell>{idx + 1}</CTableHeaderCell>
                    <CTableDataCell>{it.itemName}</CTableDataCell>
                    <CTableDataCell>
                      {it.description.length > 50
                        ? `${it.description.slice(0, 50)}…`
                        : it.description}
                    </CTableDataCell>
                    <CTableDataCell>{it.unit}</CTableDataCell>
                    <CTableDataCell className="text-center">{it.quantity}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      RM {it.unitPrice.toFixed(2)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      RM {it.markedUp.toFixed(2)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      RM {parseFloat(it.lineTotal).toFixed(2)}
                    </CTableDataCell>
                  </CTableRow>
                ))}

                {/* — summary rows start here — */}
                <CTableRow>
                  <CTableDataCell colSpan={7} className="fw-bold text-end">
                    Subtotal
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-bold">
                    RM {subtotal.toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-end">
                    Delivery Charge
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    RM {deliveryCharge.toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-end">
                    Miscellaneous Charge
                  </CTableDataCell>
                  <CTableDataCell className="text-end">RM {miscCharge.toFixed(2)}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-end">
                    Discount
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    -RM {discount.toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-end">
                    SST ({sstPercent}%)
                  </CTableDataCell>
                  <CTableDataCell className="text-end">RM {sstAmount.toFixed(2)}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={7} className="fw-bold text-end text-success">
                    Grand Total
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-bold">
                    RM {grandTotal.toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
                {/* — summary rows end here — */}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
