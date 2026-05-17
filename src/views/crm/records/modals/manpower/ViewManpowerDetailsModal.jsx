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
  CTableDataCell,
} from '@coreui/react'

/**
 * Modal for viewing Manpower Supply quotation details
 */
const ViewManpowerDetailsModal = ({ visible, record, onClose }) => {
  if (!visible || !record) return null

  // Top-level fields
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

  // Service specifics
  const {
    natureOfWork,
    siteLocation,
    durationMonths,
    durationHours,
    billingUnit,
    noOfPax,
    inquiryRemarks,
    unitCost,
    sstPercent,
  } = formData
  const isHourly = billingUnit === 'hour'
  const durationValue = isHourly ? durationHours : durationMonths
  const durationUnitLabel = isHourly ? 'hours' : 'months'
  const unitCostLabel = isHourly ? 'per pax per hour' : 'per pax per month'

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
        <CModalTitle>Manpower Quotation Details</CModalTitle>
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

          {/* Service Details */}
          <CCardHeader>
            <strong>Service Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Nature of Work</CFormLabel>
                <br />
                {natureOfWork}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Site Location</CFormLabel>
                <br />
                {siteLocation}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Duration ({durationUnitLabel})</CFormLabel>
                <br />
                {durationValue}
              </CCol>
              <CCol md={4}>
                <CFormLabel>No. of Pax</CFormLabel>
                <br />
                {noOfPax}
              </CCol>
              <CCol md={4}>
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
                {/* Service Cost */}
                <CTableRow>
                  <CTableDataCell>
                    Service Cost
                    <br />
                    <small className="text-muted">
                      {noOfPax} pax x {durationValue} {durationUnitLabel} x RM {unitCost.toFixed(2)}{' '}
                      {unitCostLabel}
                    </small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    RM{' '}
                    {(noOfPax * unitCost * durationValue).toLocaleString('en-MY', {
                      minimumFractionDigits: 2,
                    })}
                  </CTableDataCell>
                </CTableRow>

                {/* Discount */}
                <CTableRow>
                  <CTableDataCell>Discount</CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    -RM {discountAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
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

                {/* SST */}
                <CTableRow>
                  <CTableDataCell>
                    SST ({sstPercent}%)
                    <br />
                    <small className="text-muted">On net amount</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    RM {sst_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                {/* Grand Total */}
                <CTableRow>
                  <CTableDataCell className="fw-bold text-success">Grand Total</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">
                    RM {parseFloat(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
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

export default ViewManpowerDetailsModal
