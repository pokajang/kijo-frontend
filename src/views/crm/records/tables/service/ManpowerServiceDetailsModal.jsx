import React from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'

const ManpowerServiceDetailsModal = ({ visible = false, selectedServiceDetails, onClose }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
    <CModalHeader closeButton>
      <CModalTitle>Service Details</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <CRow className="g-3">
        <CCol xs={12}>
          <CFormLabel>Quotation ID</CFormLabel>
          <div>{selectedServiceDetails?.quotationId || '-'}</div>
        </CCol>
        <CCol xs={12}>
          <CFormLabel>Service Title</CFormLabel>
          <div>{selectedServiceDetails?.serviceTitle || '-'}</div>
        </CCol>
        <CCol xs={12}>
          <CFormLabel>Nature</CFormLabel>
          <div>{selectedServiceDetails?.natureOfWork || '-'}</div>
        </CCol>
        <CCol xs={12}>
          <CFormLabel>Location</CFormLabel>
          <div>{selectedServiceDetails?.siteLocation || '-'}</div>
        </CCol>
        <CCol xs={6}>
          <CFormLabel>Duration</CFormLabel>
          <div>
            {selectedServiceDetails?.billingUnit === 'hour' &&
            selectedServiceDetails?.durationHours != null
              ? `${selectedServiceDetails.durationHours} hour${Number(selectedServiceDetails.durationHours) === 1 ? '' : 's'}`
              : selectedServiceDetails?.durationMonths != null
                ? `${selectedServiceDetails.durationMonths} month${Number(selectedServiceDetails.durationMonths) === 1 ? '' : 's'}`
                : '-'}
          </div>
        </CCol>
        <CCol xs={6}>
          <CFormLabel>Pax</CFormLabel>
          <div>
            {selectedServiceDetails?.noOfPax != null ? selectedServiceDetails.noOfPax : '-'}
          </div>
        </CCol>
        <CCol xs={12}>
          <CFormLabel>Remarks</CFormLabel>
          <div>{selectedServiceDetails?.inquiryRemarks || '-'}</div>
        </CCol>
      </CRow>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" onClick={onClose}>
        Close
      </CButton>
    </CModalFooter>
  </CModal>
)

export default ManpowerServiceDetailsModal
