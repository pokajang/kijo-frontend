import React, { useEffect, useRef } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormTextarea,
  CFormInput,
  CFormLabel,
  CCol,
  CRow,
} from '@coreui/react'

const FollowUpModal = ({
  visible,
  onCancel,
  onConfirm,
  remarks,
  onRemarksChange,
  followUpDate,
  onDateChange,
  submitting = false, // optional: pass from parent while POSTing
  isSubmitting,
}) => {
  const textRef = useRef(null)
  const busy = isSubmitting ?? submitting

  useEffect(() => {
    if (visible) {
      // small delay to ensure modal mounts before focusing
      setTimeout(() => textRef.current?.focus(), 0)
    }
  }, [visible])

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && remarks.trim() && followUpDate && !busy) {
      onConfirm()
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Follow Up Record</CModalTitle>
      </CModalHeader>
      <CModalBody onKeyDown={handleKeyDown}>
        <CRow className="mb-3">
          <CCol>
            <CFormLabel>Follow Up Details</CFormLabel>
            <CFormTextarea
              ref={textRef}
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder="E.g., Called client to discuss quotation, client will review and get back next week..."
              rows={4}
              required
            />
          </CCol>
        </CRow>
        <CRow>
          <CCol>
            <CFormLabel>Date of Follow Up</CFormLabel>
            <CFormInput
              type="date"
              value={followUpDate}
              onChange={(e) => onDateChange(e.target.value)}
              max={today} // prevents selecting future dates
              required
            />
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={onConfirm}
          disabled={!remarks.trim() || !followUpDate || busy}
        >
          {busy ? 'Saving...' : 'Save Follow Up'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default FollowUpModal
