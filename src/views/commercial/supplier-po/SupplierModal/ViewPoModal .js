// src/views/purchase/SupplierPoModal/ViewPoModal.jsx
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
import { formatMoney } from '../../../../utils/formatters/numberFormatters'

const ViewPoModal = ({ visible, onClose, po }) => {
  if (!visible || !po) return null

  const {
    po_ref_no,
    supplier_name,
    supplier_address,
    supplier_contact_name,
    supplier_contact_number,
    discount,
    delivery_charge,
    sst_percent,
    sst_amount,
    grand_total,
    created_at,
    status,
    status_remarks,
    items = [],
  } = po

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
        <CModalTitle>Supplier PO Preview</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          {/* Supplier Details */}
          <CCardHeader>
            <strong>Supplier Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Supplier Name</CFormLabel>
                <div>{supplier_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Address</CFormLabel>
                <div>{supplier_address}</div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <CFormLabel>Contact Person</CFormLabel>
                <div>{supplier_contact_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Contact Number</CFormLabel>
                <div>{supplier_contact_number}</div>
              </CCol>
            </CRow>
          </CCardBody>

          {/* PO Details */}
          <CCardHeader>
            <strong>PO Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>PO Number</CFormLabel>
                <div>{po_ref_no}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Date Issued</CFormLabel>
                <div>{created_at}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Status</CFormLabel>
                <div>{status}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Status Remarks</CFormLabel>
                <div>{status_remarks || '-'}</div>
              </CCol>
            </CRow>
          </CCardBody>

          {/* Item Breakdown */}
          <CCardHeader>
            <strong>Item Breakdown</strong>
          </CCardHeader>
          <CCardBody>
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover responsive className="mb-3 data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                  <CTableHeaderCell>Item</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Unit</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Unit Price (RM)</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Line Total (RM)</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.map((item, idx) => (
                  <CTableRow key={idx}>
                    <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                    <CTableDataCell>{item.item_name}</CTableDataCell>
                    <CTableDataCell>
                      {item.description.length > 50
                        ? `${item.description.slice(0, 50)}…`
                        : item.description}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">{item.quantity}</CTableDataCell>
                    <CTableDataCell className="text-center">{item.unit}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(item.unit_price)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(item.line_total)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-end">
                    Discount (RM)
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{formatMoney(discount)}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-end">
                    Delivery Charge (RM)
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatMoney(delivery_charge)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-end">
                    SST ({sst_percent}%)
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{formatMoney(sst_amount)}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-end">
                    <strong>Grand Total (RM)</strong>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <strong>{formatMoney(grand_total)}</strong>
                  </CTableDataCell>
                </CTableRow>
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

export default ViewPoModal
