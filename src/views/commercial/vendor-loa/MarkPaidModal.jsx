// src/views/commercial/vendor/MarkPaidModal.jsx

import React, { useEffect, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CRow,
  CCol,
} from '@coreui/react'

const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MarkPaidModal = ({ visible, onClose, onConfirm, record, submitting = false }) => {
  const [transactionDate, setTransactionDate] = useState(getTodayDate)

  useEffect(() => {
    if (visible) {
      setTransactionDate(getTodayDate())
    }
  }, [visible, record?.payment_id])

  const handleSubmit = async () => {
    if (!record || !transactionDate || submitting) return
    await onConfirm({ ...record, transactionDate })
  }

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader>
        <CModalTitle>Mark Payment as Paid</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm>
          <CRow className="mb-3">
            <CCol xs={12}>
              <p>
                Are you sure marking this vendor payment as <strong>Paid</strong>?
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
                disabled={submitting}
              />
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleSubmit}
          disabled={!record || !transactionDate || submitting}
        >
          Confirm
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default MarkPaidModal
