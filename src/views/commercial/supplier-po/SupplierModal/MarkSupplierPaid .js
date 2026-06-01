// src/views/purchase/SupplierPoModal/MarkSupplierPaid.js

import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
  CRow,
  CCol,
} from '@coreui/react'

const MarkSupplierPaid = ({ visible, onClose, onConfirm, record }) => {
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD
  })

  const [remarks, setRemarks] = useState('')

  const handleSubmit = () => {
    onConfirm({
      ...record,
      transactionDate,
      remarks,
    })
  }

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader>
        <CModalTitle>Mark Supplier PO as Paid</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm>
          <CRow className="mb-3">
            <CCol xs={12}>
              <p>
                Are you sure you want to mark this Supplier PO as <strong>Paid</strong>?
              </p>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel htmlFor="transactionDate">Transaction Date</CFormLabel>
              <CFormInput
                type="date"
                id="transactionDate"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel htmlFor="remarks">Remarks</CFormLabel>
              <CFormTextarea
                id="remarks"
                rows={2}
                placeholder="Optional remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSubmit}>
          Confirm
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default MarkSupplierPaid
