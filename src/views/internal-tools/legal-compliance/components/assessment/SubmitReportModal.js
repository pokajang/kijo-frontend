import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const SubmitReportModal = ({ visible, isSaving, onClose, onConfirm }) => (
  <CModal
    visible={visible}
    onClose={() => {
      if (!isSaving) onClose()
    }}
    alignment="center"
  >
    <CModalHeader closeButton={!isSaving}>
      <CModalTitle>Submit Report</CModalTitle>
    </CModalHeader>
    <CModalBody>Submit this assessment report?</CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
        Cancel
      </CButton>
      <CButton color="primary" size="sm" onClick={onConfirm} disabled={isSaving}>
        {isSaving ? 'Submitting...' : 'Submit Report'}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default SubmitReportModal
