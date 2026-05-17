// src/components/AppraisalModal.js
import React, { useEffect, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'

import StaffSelector from './StaffSelector'

/**
 * Props:
 * - visible: boolean
 * - section: string
 * - formData: { selectedStaff, eventDate, quickInput }
 * - onClose: () => void
 * - onInputChange: (e) => void
 * - onSubmit: () => void
 * - title?: string
 * - submitLabel?: string
 * - disableStaffSelect?: boolean
 * - infoContent?: React.ReactNode
 */
const AppraisalModal = ({
  visible,
  section,
  formData,
  onClose,
  onInputChange,
  onSubmit,
  title,
  submitLabel = 'Save',
  disableStaffSelect = false,
  infoContent = null,
}) => {
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    if (!visible) {
      setShowInfo(false)
    }
  }, [visible])

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} size="lg">
      <CModalHeader closeButton>
        <CModalTitle className="d-flex align-items-center">
          <span className="me-2">{title || `Submit ${section}`}</span>
          <CButton
            color="link"
            className="p-0"
            style={{ lineHeight: 1 }}
            disabled={!infoContent}
            onClick={() => setShowInfo((prev) => !prev)}
          >
            <CIcon icon={cilInfo} size="lg" />
          </CButton>
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {showInfo && infoContent && (
          <CAlert color="info" className="mb-3">
            {infoContent}
            <div className="d-flex justify-content-end mt-3">
              <CButton color="link" className="p-0" onClick={() => setShowInfo(false)}>
                Close
              </CButton>
            </div>
          </CAlert>
        )}

        <CFormLabel>Staff Name</CFormLabel>
        <StaffSelector
          name="selectedStaff"
          value={formData.selectedStaff}
          onChange={onInputChange}
          disabled={disableStaffSelect}
        />

        <CFormLabel className="mt-3">Event Date</CFormLabel>
        <CFormInput
          type="date"
          name="eventDate"
          value={formData.eventDate}
          onChange={onInputChange}
        />

        <CFormLabel className="mt-3">Feedback</CFormLabel>
        <CFormTextarea
          name="quickInput"
          rows={3}
          placeholder={`Enter details for ${section}`}
          value={formData.quickInput}
          onChange={onInputChange}
        />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={onSubmit}>
          {submitLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AppraisalModal
