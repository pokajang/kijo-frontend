import React from 'react'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react'

const DeleteCompanyModal = ({ visible, onClose, onConfirm, companyName, loading = false }) => {
  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Confirm Company Delete</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-2">
          Delete <strong>{companyName || 'this company'}</strong>?
        </p>
        <small className="text-muted">
          This will deactivate the company, deactivate all branches, and unassign all linked PICs.
        </small>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default DeleteCompanyModal
