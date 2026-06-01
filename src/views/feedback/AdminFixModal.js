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

const STATUS_OPTIONS = ['Pending', 'Fixed Pending Pushed', 'In Progress', 'Fixed Completed']

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
