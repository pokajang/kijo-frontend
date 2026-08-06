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
  CFormTextarea,
} from '@coreui/react'

import DoEditModalBreakdown from './DoEditModalBreakdown'

// Default shape for a new breakdown item
const initialNewItem = {
  item_name: '',
  description: '',
  item_remarks: '',
  quantity: 1,
  unit: 'pcs',
}

// Default formData shape (top‑level fields + breakdown)
const initialFormData = {
  do_number: '',
  client_name: '',
  client_address: '',
  client_contact_name: '',
  client_contact_position: '',
  client_contact_phone: '',
  client_contact_email: '',
  project_name: '',
  project_code: '',
  project_type: '',
  project_award_date: '',
  project_service_period: '',
  project_description: '',
  quotation_remarks: '',
  company_contact_name: '',
  company_contact_email: '',
  company_contact_phone: '',
  breakdown: [],
  newItem: { ...initialNewItem },
}

const DoEditModalMain = ({ visible, onClose, data, onSave }) => {
  const [formData, setFormData] = useState({ ...initialFormData })

  // Merge incoming `data` without wiping out defaults
  useEffect(() => {
    if (!data) return
    setFormData((prev) => ({
      ...prev,
      ...data,
      breakdown: Array.isArray(data.breakdown) ? data.breakdown : [],
      // keep prev.newItem so user edits aren't reset
    }))
  }, [data])

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  if (!formData) return null

  return (
    <CModal
      size="lg"
      visible={visible}
      onClose={onClose}
      backdrop="static"
      alignment="center"
      scrollable
    >
      <CModalHeader onClose={onClose}>
        <CModalTitle>Edit Delivery Order – {formData.do_number}</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {/* Client Information */}
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Client Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Client Name</CFormLabel>
                <CFormInput
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Client Address</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={formData.client_address}
                  onChange={(e) => handleChange('client_address', e.target.value)}
                />
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Contact Person</CFormLabel>
                <CFormInput
                  value={formData.client_contact_name}
                  onChange={(e) => handleChange('client_contact_name', e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Position</CFormLabel>
                <CFormInput
                  value={formData.client_contact_position}
                  onChange={(e) => handleChange('client_contact_position', e.target.value)}
                />
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Phone</CFormLabel>
                <CFormInput
                  value={formData.client_contact_phone}
                  onChange={(e) => handleChange('client_contact_phone', e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput
                  value={formData.client_contact_email}
                  onChange={(e) => handleChange('client_contact_email', e.target.value)}
                />
              </CCol>
            </CRow>
          </CCardBody>

          {/* Project Information */}
          <CCardHeader>
            <strong>Project Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Project Name</CFormLabel>
                <CFormInput
                  value={formData.project_name}
                  onChange={(e) => handleChange('project_name', e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Project Code</CFormLabel>
                <CFormInput
                  value={formData.project_code}
                  onChange={(e) => handleChange('project_code', e.target.value)}
                />
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Type</CFormLabel>
                <CFormInput
                  value={formData.project_type}
                  onChange={(e) => handleChange('project_type', e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Award Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={formData.project_award_date}
                  onChange={(e) => handleChange('project_award_date', e.target.value)}
                />
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Service Period</CFormLabel>
                <CFormInput
                  value={formData.project_service_period}
                  onChange={(e) => handleChange('project_service_period', e.target.value)}
                />
              </CCol>
              <CCol md={6} />
            </CRow>

            <CRow>
              <CCol md={12}>
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={formData.project_description}
                  onChange={(e) => handleChange('project_description', e.target.value)}
                />
              </CCol>
            </CRow>
            <CRow className="mt-2">
              <CCol md={12}>
                <CFormLabel>Quotation Remarks</CFormLabel>
                <CFormTextarea
                  rows={3}
                  maxLength={2000}
                  value={formData.quotation_remarks || ''}
                  onChange={(e) => handleChange('quotation_remarks', e.target.value)}
                />
              </CCol>
            </CRow>
          </CCardBody>

          {/* Issued By */}
          <CCardHeader>
            <strong>Issued By</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={4}>
                <CFormLabel>Name</CFormLabel>
                <CFormInput
                  value={formData.company_contact_name}
                  onChange={(e) => handleChange('company_contact_name', e.target.value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput
                  value={formData.company_contact_email}
                  onChange={(e) => handleChange('company_contact_email', e.target.value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Phone</CFormLabel>
                <CFormInput
                  value={formData.company_contact_phone}
                  onChange={(e) => handleChange('company_contact_phone', e.target.value)}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* Item Breakdown child component */}
        <DoEditModalBreakdown formData={formData} setFormData={setFormData} />
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={() => onSave(formData)}>
          Save Changes
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default DoEditModalMain
