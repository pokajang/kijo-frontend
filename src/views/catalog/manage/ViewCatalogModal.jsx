import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CButton,
} from '@coreui/react'
import { resolveAssetUrl } from '../../../utils/assetUrls'
import { formatMoney } from '../../../utils/formatters/numberFormatters'

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
                  {formatMoney(item.supplier_price)}/{item.unit}
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
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ViewCatalogModal
