import React, { useEffect, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormLabel,
  CFormInput,
} from '@coreui/react'

const UpdateHrdClaimRefModal = ({ visible, onClose, invoice, onConfirmed }) => {
  const [claimRef, setClaimRef] = useState('')

  useEffect(() => {
    if (!invoice) return
    setClaimRef(invoice.hrdClaimRef || invoice.raw?.hrd_claim_ref || '')
  }, [invoice])

  if (!invoice) return null

  const handleSave = () => {
    onConfirmed(invoice, claimRef)
    onClose?.()
  }

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader>
        <CModalTitle>Update HRD Claim Ref</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-2">
          <strong>Invoice:</strong> {invoice.id || '-'}
        </div>
        <CFormLabel>HRD Claim Ref No</CFormLabel>
        <CFormInput
          type="text"
          value={claimRef}
          onChange={(e) => setClaimRef(e.target.value)}
          placeholder="e.g. C1062417SBL_24_1903908"
        />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSave}>
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default UpdateHrdClaimRefModal
