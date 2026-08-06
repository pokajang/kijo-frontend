// src/views/feedback/AdminFixModal.jsx

import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CRow,
  CCol,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CButton,
} from '@coreui/react'
import { DEVELOPER_STATUS_OPTIONS, RESOLUTION_TRACK_OPTIONS } from './feedbackWorkflow'

export const STATUS_OPTIONS = DEVELOPER_STATUS_OPTIONS
export { RESOLUTION_TRACK_OPTIONS }

const AdminFixModal = ({ visible, data, onClose, onChangeField, onSave }) => {
  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader>
        <CModalTitle>Admin Fix Issue</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm>
          <CRow className="mb-3">
            <CCol xs={4}>
              <strong>Status</strong>
            </CCol>
            <CCol xs={8}>
              <CFormSelect
                value={data.status || 'Pending'}
                onChange={(e) => onChangeField('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </CFormSelect>
              {data.status === 'Fixed Completed' ? (
                <div className="form-text">The reporter will be asked to verify this fix.</div>
              ) : null}
            </CCol>
          </CRow>
          <CRow className="mb-3">
            <CCol xs={4}>
              <strong>Resolution Track</strong>
            </CCol>
            <CCol xs={8}>
              <CFormSelect
                value={data.resolution_track || 'Needs Triage'}
                onChange={(e) => onChangeField('resolution_track', e.target.value)}
              >
                {RESOLUTION_TRACK_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
          <CRow className="mb-3">
            <CCol xs={4}>
              <strong>Action Date</strong>
            </CCol>
            <CCol xs={8}>
              <CFormInput
                type="date"
                value={data.action_date}
                onChange={(e) => onChangeField('action_date', e.target.value)}
              />
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={4}>
              <strong>Remarks</strong>
            </CCol>
            <CCol xs={8}>
              <CFormTextarea
                rows="3"
                value={data.remarks}
                onChange={(e) => onChangeField('remarks', e.target.value)}
              />
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={onSave}>
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AdminFixModal
