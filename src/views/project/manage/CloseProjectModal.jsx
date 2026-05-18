import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'

const validCloseTypes = new Set(['Completed', 'Terminated'])

const CloseProjectModal = ({
  visible,
  project,
  initialCloseType = 'Completed',
  onClose,
  onConfirm,
}) => {
  const today = new Date().toISOString().split('T')[0]
  const selectedCloseType = validCloseTypes.has(initialCloseType) ? initialCloseType : 'Completed'

  const [payload, setPayload] = useState({
    closeDate: today,
    closeType: selectedCloseType,
    reason: '',
  })

  const [checks, setChecks] = useState({
    claims: false,
    vendors: false,
    services: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) return
    setPayload({
      closeDate: today,
      closeType: selectedCloseType,
      reason: '',
    })
    setChecks({ claims: false, vendors: false, services: false })
    setIsSubmitting(false)
  }, [project?.id, selectedCloseType, today, visible])

  useEffect(() => {
    if (payload.closeType === 'Terminated') {
      setChecks({ claims: false, vendors: false, services: false })
    }
  }, [payload.closeType])

  const handlePayloadChange = (e) => {
    const { name, value } = e.target
    setPayload((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckChange = (e) => {
    const { id, checked } = e.target
    setChecks((prev) => ({ ...prev, [id]: checked }))
  }

  const hasRemarks = payload.reason.trim() !== ''
  const isFormValid =
    payload.closeType === 'Terminated'
      ? hasRemarks
      : Object.values(checks).every(Boolean) && hasRemarks
  const isTermination = payload.closeType === 'Terminated'
  const actionLabel = isTermination ? 'Terminate Project' : 'Complete Project'
  const remarksLabel = isTermination ? 'Termination Cause' : 'Closure Remarks'
  const remarksTitle = isTermination ? 'Termination Details' : 'Closure Remarks'
  const remarksPlaceholder = isTermination
    ? 'e.g. Project was terminated due to budget cuts from client.'
    : 'e.g. Project completed and all deliverables were accepted.'
  const handleCancel = () => {
    if (!isSubmitting) onClose()
  }

  const handleCloseProject = async () => {
    if (isSubmitting) return

    const confirmed = await dialog.confirm(
      isTermination
        ? 'Are you sure you want to terminate this project?'
        : 'Are you sure you want to complete this project?',
    )

    if (!confirmed) return

    const finalPayload = {
      project_id: project.id,
      closeDate: payload.closeDate,
      closeType: payload.closeType,
      reason: payload.reason,
      claims: checks.claims,
      vendors: checks.vendors,
      services: checks.services,
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(project.id)}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(finalPayload),
        },
      )
      const data = await res.json()

      if (data.status === 'success') {
        dialog.alert(
          isTermination ? 'Project terminated successfully.' : 'Project completed successfully.',
        )
        onConfirm()
      } else {
        dialog.alert('Failed to close project: ' + data.message)
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('Error closing project:', err)
      dialog.alert('Server error occurred.')
      setIsSubmitting(false)
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={handleCancel}
      size="lg"
      alignment="center"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>{actionLabel}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CCard>
          <CCardHeader>
            <strong>{actionLabel}</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel htmlFor="closeDate">Closing Date</CFormLabel>
                <CFormInput
                  type="date"
                  id="closeDate"
                  name="closeDate"
                  value={payload.closeDate}
                  onChange={handlePayloadChange}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel htmlFor="closeType">Closure Type</CFormLabel>
                <CFormInput id="closeType" name="closeType" value={payload.closeType} disabled />
              </CCol>

              {payload.closeType === 'Completed' && (
                <CCol md={12}>
                  <CFormLabel>Closure Checks</CFormLabel>
                  <div className="d-flex gap-4">
                    <CFormCheck
                      inline
                      id="claims"
                      label="All claims received"
                      checked={checks.claims}
                      onChange={handleCheckChange}
                    />
                    <CFormCheck
                      inline
                      id="vendors"
                      label="All vendors paid"
                      checked={checks.vendors}
                      onChange={handleCheckChange}
                    />
                    <CFormCheck
                      inline
                      id="services"
                      label="All due services completed"
                      checked={checks.services}
                      onChange={handleCheckChange}
                    />
                  </div>
                </CCol>
              )}
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>{remarksTitle}</strong>
          </CCardHeader>
          <CCardBody>
            <CFormLabel htmlFor="reason">{remarksLabel}</CFormLabel>
            <CFormInput
              id="reason"
              name="reason"
              placeholder={remarksPlaceholder}
              value={payload.reason}
              onChange={handlePayloadChange}
            />
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" size="sm" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton
          color={isTermination ? 'danger' : 'primary'}
          size="sm"
          disabled={!isFormValid || isSubmitting}
          onClick={handleCloseProject}
        >
          {isSubmitting ? 'Submitting...' : actionLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CloseProjectModal
