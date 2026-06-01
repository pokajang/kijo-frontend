// ViewVendorModal.js

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
} from '@coreui/react'

const ViewVendorModal = ({ visible, vendor, onClose }) => {
  const fmt = (val) => val || '-'
  const fmtList = (arr) => (Array.isArray(arr) && arr.length ? arr.join(', ') : '-')

  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center" scrollable>
      <CModalHeader>
        <CModalTitle>Vendor Details</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          {/* Vendor Information */}
          <CCardHeader>
            <strong>Vendor Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <CFormLabel>Vendor Name</CFormLabel>
                <div>{fmt(vendor.vendorName)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>SSM Number</CFormLabel>
                <div>{fmt(vendor.ssmNumber)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>SST Number</CFormLabel>
                <div>{fmt(vendor.sstNo)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Address</CFormLabel>
                <div>{fmt(vendor.address)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>City</CFormLabel>
                <div>{fmt(vendor.city)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>State</CFormLabel>
                <div>{fmt(vendor.state)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>Zip Code</CFormLabel>
                <div>{fmt(vendor.zip)}</div>
              </CCol>
              <CCol md={6} />
            </CRow>
          </CCardBody>

          {/* Contact Information */}
          <CCardHeader>
            <strong>Contact Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <CFormLabel>Contact Person</CFormLabel>
                <div>{fmt(vendor.contactPersonName)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Mobile Number</CFormLabel>
                <div>{fmt(vendor.mobileNumber)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>Email</CFormLabel>
                <div>{fmt(vendor.email)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Website</CFormLabel>
                <div>{fmt(vendor.companyWebsite)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>Emergency Contact</CFormLabel>
                <div>{fmt(vendor.emergencyContactName)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Relationship</CFormLabel>
                <div>{fmt(vendor.emergencyRelationship)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>Emergency Number</CFormLabel>
                <div>{fmt(vendor.emergencyMobileNumber)}</div>
              </CCol>
              <CCol md={6} />
            </CRow>
          </CCardBody>

          {/* Vendor Categories */}
          <CCardHeader>
            <strong>Vendor Categories</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <CFormLabel>Categories</CFormLabel>
                <div>{fmtList(vendor.category)}</div>
              </CCol>
              <CCol md={6} />
            </CRow>
          </CCardBody>

          {/* Training Topics */}
          {vendor.category?.includes('Trainer') && (
            <>
              <CCardHeader>
                <strong>Training Topics</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol md={6}>
                    <CFormLabel>Topics</CFormLabel>
                    <div>{fmtList(vendor.trainingTopics)}</div>
                  </CCol>
                  <CCol md={6} />
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Competencies */}
          {vendor.category?.includes('Competent Person') && (
            <>
              <CCardHeader>
                <strong>Competencies</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol md={6}>
                    <CFormLabel>Competencies</CFormLabel>
                    <div>{fmtList(vendor.competency)}</div>
                  </CCol>
                  <CCol md={6} />
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Products Supplied */}
          {vendor.category?.includes('Equipment Supplier') && (
            <>
              <CCardHeader>
                <strong>Products Supplied</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol md={6}>
                    <CFormLabel>Products</CFormLabel>
                    <div>{fmtList(vendor.supplierProducts)}</div>
                  </CCol>
                  <CCol md={6} />
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Consultancy Fields */}
          {vendor.category?.includes('Consultant') && (
            <>
              <CCardHeader>
                <strong>Consultancy Fields</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol md={6}>
                    <CFormLabel>Fields</CFormLabel>
                    <div>{fmtList(vendor.consultancy)}</div>
                  </CCol>
                  <CCol md={6} />
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Services Offered */}
          {vendor.category?.includes('Service Provider') && (
            <>
              <CCardHeader>
                <strong>Services Offered</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol md={6}>
                    <CFormLabel>Services</CFormLabel>
                    <div>{fmtList(vendor.servicesOffered)}</div>
                  </CCol>
                  <CCol md={6} />
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Banking Information */}
          <CCardHeader>
            <strong>Banking Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <CFormLabel>Bank Name</CFormLabel>
                <div>{fmt(vendor.bankName)}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Account Number</CFormLabel>
                <div>{fmt(vendor.bankAccountNumber)}</div>
              </CCol>
            </CRow>
            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>Account Holder</CFormLabel>
                <div>{fmt(vendor.bankHolderName)}</div>
              </CCol>
              <CCol md={6} />
            </CRow>
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

export default ViewVendorModal
