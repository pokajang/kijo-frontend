import React from 'react'
import {
  CButton,
  CCardBody,
  CCardFooter,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const emptyValue = '-'

const DetailItem = ({ label, value }) => (
  <CCol xs={12} md={4}>
    <div className="text-body-secondary small">{label}</div>
    <div className="fw-semibold">{value || emptyValue}</div>
  </CCol>
)

const DeliveryOrderReviewStep = ({ payload, submitting, onBack, onCreate }) => {
  const details = payload?.details || {}
  const items = Array.isArray(payload?.items) ? payload.items : []

  return (
    <>
      <CCardBody>
        <div className="mb-3">
          <h5 className="mb-3">Review Delivery Order</h5>
          <CRow className="g-3">
            <DetailItem label="Client" value={details.client_name} />
            <DetailItem label="Client Contact" value={details.client_contact_name} />
            <DetailItem label="Client Email" value={details.client_contact_email} />
            <DetailItem label="Project" value={details.project_name} />
            <DetailItem label="Project Code" value={details.project_code} />
            <DetailItem label="Service Period" value={details.project_service_period} />
            <DetailItem label="Company Contact" value={details.company_contact_name} />
            <DetailItem label="Company Email" value={details.company_contact_email} />
            <DetailItem label="Company Phone" value={details.company_contact_phone} />
          </CRow>
        </div>

        <div className="data-table-embedded-shell">
          {/* datatable-exempt: embedded review layout table */}
          <CTable hover responsive className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>#</CTableHeaderCell>
                <CTableHeaderCell>Item</CTableHeaderCell>
                <CTableHeaderCell>Description</CTableHeaderCell>
                <CTableHeaderCell>Quantity</CTableHeaderCell>
                <CTableHeaderCell>Unit</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.map((item, index) => (
                <CTableRow key={`${item.item_name}-${index}`}>
                  <CTableHeaderCell>{index + 1}</CTableHeaderCell>
                  <CTableDataCell>{item.item_name || emptyValue}</CTableDataCell>
                  <CTableDataCell>{item.description || emptyValue}</CTableDataCell>
                  <CTableDataCell>{item.quantity || emptyValue}</CTableDataCell>
                  <CTableDataCell>{item.unit || emptyValue}</CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onBack}
          disabled={submitting}
        >
          Back to Edit
        </CButton>
        <CButton color="primary" size="sm" onClick={onCreate} disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Delivery Order'}
        </CButton>
      </CCardFooter>
    </>
  )
}

export default DeliveryOrderReviewStep
