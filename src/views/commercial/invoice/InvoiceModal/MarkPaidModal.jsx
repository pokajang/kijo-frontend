import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'

const getLocalISODate = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const MarkPaidModal = ({ visible, onClose, invoice, onConfirmed }) => {
  // Always initialize hooks at the top
  const [paidDate, setPaidDate] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [paidRemarks, setPaidRemarks] = useState('')

  useEffect(() => {
    if (invoice) {
      setPaidAmount(invoice.raw.grand_total?.replace('RM ', '') || '')
      setPaidDate(getLocalISODate())
      setPaidRemarks('')
    }
  }, [invoice])

  // Only render when invoice is available
  if (!invoice) return null

  const refNo = invoice.raw?.invoice_ref_no || ''

  const handleConfirm = () => {
    onConfirmed(invoice, {
      paid_date: paidDate,
      paid_amount: paidAmount,
      paid_remarks: paidRemarks,
    })
  }

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Mark Invoice as Paid</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p>
          Are you sure you want to mark invoice <strong>{refNo}</strong> as paid?
        </p>
        <CForm className="mt-3">
          <CFormLabel>Date Paid</CFormLabel>
          <CFormInput type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />

          <CFormLabel className="mt-3">Amount Paid (RM)</CFormLabel>
          <CFormInput
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />

          <CFormLabel className="mt-3">Remarks</CFormLabel>
          <CFormTextarea
            rows={3}
            value={paidRemarks}
            onChange={(e) => setPaidRemarks(e.target.value)}
            placeholder="e.g. Client paid on time, Puas minta baru bayar klien ni!"
          />
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleConfirm}>
          Confirm
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default MarkPaidModal
