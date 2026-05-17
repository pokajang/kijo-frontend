// crm/records/modals/special/QuoteMetadataSection.jsx
import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel, CBadge } from '@coreui/react'

export default function QuoteMetadataSection({
  quotationId,
  revisionNo,
  dateCreated,
  dateUpdated,
  status,
  awardDate,
  clientLoaRefNo,
  createdById,
  createdByName,
  createdByCode,
}) {
  return (
    <>
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
            {dateCreated?.split(' ')[0]}
          </CCol>
          <CCol md={3}>
            <CFormLabel>Date Updated</CFormLabel>
            <br />
            {dateUpdated?.split(' ')[0]}
          </CCol>
          <CCol md={3}>
            <CFormLabel>Status</CFormLabel>
            <br />
            <CBadge
              color={status === 'Awarded' ? 'success' : status === 'Failed' ? 'danger' : 'info'}
            >
              {status}
            </CBadge>
            {awardDate && <small className="ms-2 text-muted">{awardDate.split(' ')[0]}</small>}
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
    </>
  )
}
