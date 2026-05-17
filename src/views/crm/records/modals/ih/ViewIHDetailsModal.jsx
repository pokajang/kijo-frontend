// crm/records/modals/ih/ViewIHDetailsModal.jsx
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
  CTableBody,
  CTableRow,
  CTableHead,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'

/**
 * Modal for viewing Industrial Hygiene quotation details
 */
const ViewIHDetailsModal = ({ visible, record, onClose }) => {
  if (!visible || !record) return null

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
    attach_proposal,
    clientDetails,
    formData,
    amount,
    subtotal,
    sst_amount,
    discountAmount,
  } = record

  const {
    serviceGroup,
    serviceTitle,
    serviceCode,
    siteAddress,
    sampleCounts,
    sampleUnit,
    numWorkUnits,
    inquiryRemarks,
    unitPrice,
    travelCharge,
    discountValue,
    sstPercent,
  } = formData

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
        <CModalTitle>IH Quotation Details</CModalTitle>
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

          {/* IH Details */}
          <CCardHeader>
            <strong>IH Service Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Service Group</CFormLabel>
                <br />
                {serviceGroup}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Service Title</CFormLabel>
                <br />
                {serviceTitle}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Service Code</CFormLabel>
                <br />
                {serviceCode}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Site Address</CFormLabel>
                <br />
                {siteAddress}
              </CCol>

              <CCol md={3}>
                <CFormLabel>Sample Count</CFormLabel>
                <br />
                {sampleCounts} {sampleUnit}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Work Units</CFormLabel>
                <br />
                {numWorkUnits}
              </CCol>
              <CCol md={12}>
                <CFormLabel>Inquiry Remarks</CFormLabel>
                <br />
                {inquiryRemarks || 'N/A'}
              </CCol>
            </CRow>
          </CCardBody>

          {/* Pricing Details */}
          <CCardHeader>
            <strong>Pricing Details</strong>
          </CCardHeader>
          <CCardBody>
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover responsive className="data-table-compact embedded-data-table">
              <CTableBody>
                <CTableRow>
                  <CTableDataCell>
                    Service Cost
                    <br />
                    <small className="text-muted">
                      {sampleCounts} {sampleUnit} x {numWorkUnits} x RM {unitPrice.toFixed(2)}
                    </small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {(sampleCounts * unitPrice * numWorkUnits).toLocaleString('en-MY', {
                      minimumFractionDigits: 2,
                    })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    Mobilization Cost
                    <br />
                    <small className="text-muted">Travel to {siteAddress}</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {travelCharge.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>Discount</CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    -{discountValue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                {/* Subtotal */}
                <CTableRow>
                  <CTableDataCell>
                    Subtotal
                    <br />
                    <small className="text-muted">Total before SST</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    RM {subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    SST ({sstPercent}%)
                    <br />
                    <small className="text-muted">On net amount</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {sst_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell className="fw-bold text-success">Grand Total</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">
                    RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>

          {/* Proposal Attachment */}
          <CCardHeader>
            <strong>Proposal Attachment</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={12}>
                <CFormLabel>Attach Full Proposal?</CFormLabel>
                <br />
                {Number(attach_proposal) === 1 ? (
                  <span className="text-success fw-bold">✅ Yes — Proposal attached.</span>
                ) : (
                  <span className="text-muted">❌ No proposal attached.</span>
                )}
              </CCol>
            </CRow>
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

export default ViewIHDetailsModal
