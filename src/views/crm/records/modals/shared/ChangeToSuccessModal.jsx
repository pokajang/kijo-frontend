import React from 'react'
import {
  CModal,
  CAlert,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormTextarea,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
} from '@coreui/react'

const ChangeToSuccessModal = ({
  visible,
  onCancel,
  onConfirm,
  mode = 'award',
  value, // success reason
  onChange,
  loaRefNo = '',
  onLoaChange,
  awardDate,
  onAwardDateChange,
  description,
  onDescriptionChange,
  isSubmitting = false,
}) => {
  const disableConfirm = !value.trim() || !description.trim() || isSubmitting
  const isReAward = mode === 're-award'
  const titleText = isReAward ? 'Reason for Re-Award' : 'Reason for Success'
  const confirmText = isReAward ? 'Confirm Re-Award' : 'Confirm Award'
  const infoText = isReAward
    ? 'Upon Confirm Re-Award, a new project instance will be created under '
    : 'Upon Confirm Award, the project will be created under '

  // Convert JS Date to yyyy-MM-dd string for input display
  const formattedAwardDate = awardDate ? new Date(awardDate).toISOString().split('T')[0] : ''

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>{titleText}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel>Success Remarks</CFormLabel>
            <CFormTextarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="E.g., Constant follow-up with clients and persistent negotiation."
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel>PO / LOA Date</CFormLabel>
            <CFormInput
              type="date"
              value={formattedAwardDate}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null
                onAwardDateChange(date)
              }}
              placeholder="Select award date"
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel>PO / LOA Reference No.</CFormLabel>
            <CFormTextarea
              value={loaRefNo}
              onChange={(e) => onLoaChange(e.target.value)}
              placeholder="E.g., UEM25PO-00000015 or Signed Quote Ref No"
            />
          </CCol>
        </CRow>

        <CRow className="mb-2">
          <CCol xs={12}>
            <CFormLabel>Project Description</CFormLabel>
            <CFormTextarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief official project description for this awarded project"
            />
          </CCol>

          <CCol className="mt-3">
            <CAlert color="primary">
              {infoText}
              <strong>Project Management &gt; Manage</strong>
            </CAlert>
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton color="success" onClick={onConfirm} disabled={disableConfirm}>
          {isSubmitting ? 'Submitting...' : confirmText}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ChangeToSuccessModal
