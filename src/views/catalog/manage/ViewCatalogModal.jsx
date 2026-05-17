import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CButton,
} from '@coreui/react'
import { resolveAssetUrl } from '../../../utils/assetUrls'

const ViewCatalogModal = ({ visible, onClose, item }) => {
  if (!item) return null

  const fullBrochureUrl = resolveAssetUrl(item.brochure_url)

  return (
    <CModal visible={visible} onClose={onClose} size="lg" scrollable>
      <CModalHeader>
        <strong>Catalog Item Details</strong>
      </CModalHeader>
      <CModalBody>
        <CCard>
          <CCardHeader>
            <strong>Item Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Item Name</CFormLabel>
                <div>{item.item_name || '-'}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Category</CFormLabel>
                <div>{item.category_id || '-'}</div>
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Supplier Name</CFormLabel>
                <div>{item.supplier_name || '-'}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Supplier Price</CFormLabel>
                <div>
                  RM {parseFloat(item.supplier_price || 0).toFixed(2)}/{item.unit}
                </div>
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Price Date</CFormLabel>
                <div>{item.price_date || '-'}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Created By</CFormLabel>
                <div>{item.created_by_code || '-'}</div>
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={12}>
                <CFormLabel>Description</CFormLabel>
                <div>{item.description || '-'}</div>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Entry Remarks</CFormLabel>
                <div>{item.remarks || '-'}</div>
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Product Brochure</strong>
          </CCardHeader>
          <CCardBody>
            {fullBrochureUrl ? (
              <>
                <iframe
                  src={fullBrochureUrl}
                  title="Brochure"
                  width="100%"
                  height="400px"
                  style={{ border: '1px solid var(--app-border-card)' }}
                />
              </>
            ) : (
              <p>No brochure attached.</p>
            )}
          </CCardBody>
        </CCard>

        <div className="text-end mt-3">
          <CButton color="secondary" onClick={onClose}>
            Close
          </CButton>
        </div>
      </CModalBody>
    </CModal>
  )
}

export default ViewCatalogModal
