import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormTextarea,
} from '@coreui/react'

const ChangeToFailModal = ({
  visible,
  onCancel,
  onConfirm,
  value,
  onChange,
  isSubmitting = false,
}) => {
  return (
    <CModal visible={visible} onClose={onCancel} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Reason for Failure</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-muted">
          Please state in detail why this quotation failed to materialize or any necessary
          information.
        </p>
        <CFormTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="E.g., Client's budget constraints, project cancellation, etc."
        />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={onConfirm} disabled={!value.trim() || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Confirm Failure'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ChangeToFailModal
