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

const formatDisplayDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

const ViewTrainingDetailsModal = ({ visible, record, onClose }) => {
  if (!visible || !record) return null

  const {
    quotationId,
    dateCreated,
    revisionNo,
    dateUpdated,
    clientDetails,
    formData,
    amount,
    status,
    awardDate,
    createdByCode,
    createdByName,
    createdById,
    sst_amount,
    hrd_amount,
    attach_proposal,
    clientLoaRefNo,
  } = record

  const startDate = formatDisplayDate(formData?.selectedDate)
  const endDate = formatDisplayDate(formData?.selectedEndDate)
  const displayDate = startDate
    ? endDate && endDate !== startDate
      ? `${startDate} to ${endDate}`
      : startDate
    : 'To Be Confirmed'

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
        <CModalTitle>Quotation Details</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          {/* Quote Metadata */}
          <CCardHeader>
            <strong>Quote Metadata</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Quotation No.</CFormLabel>
                <br />
                {quotationId || '-'}
                {revisionNo > 0 && <span className="text-muted ms-1">(Rev0{revisionNo})</span>}
              </CCol>

              <CCol md={3}>
                <CFormLabel>Date Created</CFormLabel>
                <br />
                {dateCreated.split(' ')[0] || '-'}
              </CCol>

              <CCol md={3}>
                <CFormLabel>Date Revised</CFormLabel>
                <br />
                {dateUpdated.split(' ')[0] || '-'}
              </CCol>

              <CCol md={3}>
                <CFormLabel>Status</CFormLabel>
                <br />
                {status || '-'} {awardDate || '-'}
              </CCol>

              <CCol md={3}>
                <CFormLabel>LOA / PO Ref. No.</CFormLabel>
                <br />
                {clientLoaRefNo || 'N/A when Failed'}
              </CCol>

              <CCol md={4}>
                <CFormLabel>Created By (User ID)</CFormLabel>
                <br />
                {createdById || '-'}
              </CCol>

              <CCol md={4}>
                <CFormLabel>Created By (Name)</CFormLabel>
                <br />
                {createdByName || '-'}
              </CCol>

              <CCol md={4}>
                <CFormLabel>Created By (Code)</CFormLabel>
                <br />
                {createdByCode || '-'}
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
                {clientDetails?.companyName || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>SSM Number</CFormLabel>
                <br />
                {clientDetails?.ssmNumber || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Address</CFormLabel>
                <br />
                {clientDetails?.address || '-'}
                <br />
                {clientDetails?.city || '-'}, {clientDetails?.state || '-'}{' '}
                {clientDetails?.zip || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>PIC Name</CFormLabel>
                <br />
                {clientDetails?.fullName || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Mobile Number</CFormLabel>
                <br />
                {clientDetails?.mobileNumber || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Email</CFormLabel>
                <br />
                {clientDetails?.email || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Position</CFormLabel>
                <br />
                {clientDetails?.position || '-'}
              </CCol>
            </CRow>
          </CCardBody>

          {/* Training Details */}
          <CCardHeader>
            <strong>Training Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Training Topic</CFormLabel>
                <br />
                {formData?.trainingTopic || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Training Type</CFormLabel>
                <br />
                {formData?.trainingTypeOption
                  ? formData.trainingTypeOption.charAt(0).toUpperCase() +
                    formData.trainingTypeOption.slice(1)
                  : '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Payment Method</CFormLabel>
                <br />
                {formData?.paymentMethod || '-'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Proposed Date</CFormLabel>
                <br />
                {displayDate}
              </CCol>
              <CCol md={4}>
                <CFormLabel>To Be Confirmed</CFormLabel>
                <br />
                {formData?.toBeConfirmed ? 'Yes' : 'No'}
              </CCol>
              <CCol md={4}>
                <CFormLabel>Training Venue</CFormLabel>
                <br />
                {formData?.trainingVenue || '-'}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Target Participants</CFormLabel>
                <br />
                {formData?.targetGroups ? formData.targetGroups : '-'}
              </CCol>

              <CCol md={6}>
                <CFormLabel>Quotation Remarks</CFormLabel>
                <br />
                {formData?.trainingInqRemarks || 'N/A'}
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
                    Training Cost
                    <br />
                    <small className="text-muted">
                      {formData?.sessionCount} session(s) × {formData?.trainingDuration}{' '}
                      {formData.durationUnit} × RM {formData?.unitPrice}
                    </small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {(
                      formData?.sessionCount *
                      formData?.trainingDuration *
                      formData?.unitPrice
                    )?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    Mobilization Cost
                    <br />
                    <small className="text-muted">Travel to {formData?.trainingVenue}</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formData?.travelCharge?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    Meal Cost
                    <br />
                    <small className="text-muted">
                      {formData?.mealsProvided === 'Yes'
                        ? `${formData.noOfPax} pax × RM ${formData.mealPrice} × ${formData.trainingDuration} day(s) × ${formData.sessionCount} session(s)`
                        : 'Not provided'}
                    </small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formData?.mealsProvided === 'Yes'
                      ? (
                          formData.noOfPax *
                          formData.mealPrice *
                          formData.trainingDuration *
                          formData.sessionCount
                        )?.toLocaleString('en-MY', { minimumFractionDigits: 2 })
                      : '-'}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    Discount
                    <br />
                    <small className="text-muted">{formData?.discountType}</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    -
                    {formData?.discountValue?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    SST ({formData?.sstRate}%)
                    <br />
                    <small className="text-muted">Applied on subtotal</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {sst_amount?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '-'}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell>
                    HRD Charge ({formData?.hrdCharge}%)
                    <br />
                    <small className="text-muted">Applied on net training</small>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {hrd_amount?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '-'}
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableDataCell className="fw-bold text-success">Grand Total</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">
                    RM {amount?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>

          <CCardHeader>
            <strong>Proposal Attachment</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={12}>
                <CFormLabel>Attach Detail Proposal?</CFormLabel>
                <br />
                {Number(record.attach_proposal) === 1 ? (
                  <span className="text-success fw-bold">
                    ✅ Yes — A full proposal is attached.
                  </span>
                ) : (
                  <span className="text-muted">
                    ❌ No — Proposal not attached with this quotation.
                  </span>
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

export default ViewTrainingDetailsModal
