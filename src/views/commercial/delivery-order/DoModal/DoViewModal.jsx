import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CFormLabel,
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'

const DoViewModal = ({ visible, onClose, data }) => {
  if (!data) return null

  return (
    <CModal
      size="lg"
      visible={visible}
      onClose={onClose}
      backdrop="static"
      alignment="center"
      scrollable
    >
      <CModalHeader onClose={onClose}>
        <CModalTitle>View Delivery Order - {data.do_number}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CCard>
          <CCardHeader>
            <strong>Client Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Client Name</CFormLabel>
                <div>{data.client_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Client Address</CFormLabel>
                <div>{data.client_address}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Contact Person</CFormLabel>
                <div>{data.client_contact_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Position</CFormLabel>
                <div>{data.client_contact_position}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Phone</CFormLabel>
                <div>{data.client_contact_phone}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Email</CFormLabel>
                <div>{data.client_contact_email}</div>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Project Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Project Name</CFormLabel>
                <div>{data.project_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Project Code</CFormLabel>
                <div>{data.project_code}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Type</CFormLabel>
                <div>{data.project_type}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Award Date</CFormLabel>
                <div>{data.project_award_date}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Service Period</CFormLabel>
                <div>{data.project_service_period}</div>
              </CCol>
              <CCol md={6}></CCol>
            </CRow>
            <CRow>
              <CCol md={12}>
                <CFormLabel>Description</CFormLabel>
                <div>{data.project_description}</div>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Issued By</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={4}>
                <CFormLabel>Name</CFormLabel>
                <div>{data.company_contact_name}</div>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Email</CFormLabel>
                <div>{data.company_contact_email}</div>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Phone</CFormLabel>
                <div>{data.company_contact_phone}</div>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Item Breakdown</strong>
          </CCardHeader>
          <CCardBody>
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover responsive className="data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Item Name</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell>Quantity</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.breakdown.map((item, index) => (
                  <CTableRow key={index}>
                    <CTableDataCell>{index + 1}</CTableDataCell>
                    <CTableDataCell>{item.item_name}</CTableDataCell>
                    <CTableDataCell>{item.description}</CTableDataCell>
                    <CTableDataCell>
                      {item.quantity} {item.unit || 'pcs'}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default DoViewModal
