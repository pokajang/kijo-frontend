import React from 'react'
import { CFormLabel, CFormInput } from '@coreui/react'

const ExpenseForm = ({ formData, onChange }) => (
  <div className="d-flex flex-column gap-3">
    <div>
      <CFormLabel>Transaction Date</CFormLabel>
      <CFormInput type="date" name="date" value={formData.date} onChange={onChange} />
    </div>
    <div>
      <CFormLabel>Amount (RM)</CFormLabel>
      <CFormInput type="number" name="amount" value={formData.amount} onChange={onChange} />
    </div>
    <div>
      <CFormLabel>Remarks</CFormLabel>
      <CFormInput type="text" name="remarks" value={formData.remarks} onChange={onChange} />
    </div>
    <div>
      <CFormLabel>Upload Proof</CFormLabel>
      <CFormInput type="file" name="file" onChange={onChange} />
    </div>
  </div>
)

export default ExpenseForm
