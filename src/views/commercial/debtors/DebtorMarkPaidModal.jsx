import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { formatMoney, getTodayDate } from './debtorUtils'

const DebtorMarkPaidModal = ({ visible, debtor, submitting = false, onClose, onConfirm }) => {
  const [paidDate, setPaidDate] = useState(getTodayDate())
  const [paidAmount, setPaidAmount] = useState('')
  const [paidRemarks, setPaidRemarks] = useState('')

  useEffect(() => {
    if (!visible) return
    setPaidDate(getTodayDate())
    setPaidAmount(debtor?.grandTotal ? String(debtor.grandTotal) : '')
    setPaidRemarks('')
  }, [debtor, visible])

  const handleConfirm = () => {
    onConfirm?.({
      paid_date: paidDate,
      paid_amount: paidAmount,
      paid_remarks: paidRemarks,
    })
  }

  return (
    <CModal visible={visible} onClose={submitting ? undefined : onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Mark Debtor as Paid</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <div className="fw-semibold">{debtor?.invoiceRef || '-'}</div>
          <div className="text-muted small">{debtor?.client || '-'}</div>
          <div className="text-muted small">{formatMoney(debtor?.grandTotal || 0)}</div>
        </div>
        <div className="mb-3">
          <CFormLabel>Paid Date</CFormLabel>
          <CFormInput
            type="date"
            value={paidDate}
            onChange={(event) => setPaidDate(event.target.value)}
          />
        </div>
        <div className="mb-3">
          <CFormLabel>Paid Amount</CFormLabel>
          <CFormInput
            type="number"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(event) => setPaidAmount(event.target.value)}
          />
        </div>
        <div>
          <CFormLabel>Remarks</CFormLabel>
          <CFormInput
            value={paidRemarks}
            onChange={(event) => setPaidRemarks(event.target.value)}
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Saving...' : 'Mark Paid'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

DebtorMarkPaidModal.propTypes = {
  debtor: PropTypes.object,
  onClose: PropTypes.func,
  onConfirm: PropTypes.func,
  submitting: PropTypes.bool,
  visible: PropTypes.bool,
}

export default DebtorMarkPaidModal
