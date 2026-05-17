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
  CFormSelect,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'

const CloseProjectModal = ({ visible, project, onClose, onConfirm }) => {
  const today = new Date().toISOString().split('T')[0]

  const [payload, setPayload] = useState({
    closeDate: today,
    closeType: 'Completed',
    reason: '',
  })

  const [checks, setChecks] = useState({
    claims: false,
    vendors: false,
    services: false,
  })

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

  const handleCloseProject = async () => {
    const confirmed = await dialog.confirm(`Are you sure you want to close this project.`)

    if (confirmed) {
      const finalPayload = {
        project_id: project.id,
        closeDate: payload.closeDate,
        closeType: payload.closeType,
        reason: payload.reason,
        claims: checks.claims,
        vendors: checks.vendors,
        services: checks.services,
      }

      fetch(`${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(project.id)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(finalPayload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success') {
            dialog.alert('Project closed successfully.')
            onConfirm()
          } else {
            dialog.alert('Failed to close project: ' + data.message)
          }
        })
        .catch((err) => {
          console.error('Error closing project:', err)
          dialog.alert('Server error occurred.')
        })
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="lg"
      alignment="center"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Close Project</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CCard>
          <CCardHeader>
            <strong>Close Project</strong>
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
                <CFormSelect
                  id="closeType"
                  name="closeType"
                  value={payload.closeType}
                  onChange={handlePayloadChange}
                >
                  <option value="Completed">Completed</option>
                  <option value="Terminated">Terminated</option>
                </CFormSelect>
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
            <strong>Closure Remarks</strong>
          </CCardHeader>
          <CCardBody>
            <CFormLabel htmlFor="reason">Remarks or Termination Cause</CFormLabel>
            <CFormInput
              id="reason"
              name="reason"
              placeholder="e.g. Project was terminated due to budget cuts from client."
              value={payload.reason}
              onChange={handlePayloadChange}
            />
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="danger" size="sm" disabled={!isFormValid} onClick={handleCloseProject}>
          Close Project
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CloseProjectModal
