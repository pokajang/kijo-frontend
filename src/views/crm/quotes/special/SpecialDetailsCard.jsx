import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCol,
  CFormLabel,
  CRow,
  CButton,
  CAlert,
  CFormTextarea,
  CFormInput,
} from '@coreui/react'
import Select from '../../../../components/forms/ThemedSelect'
import { useNavigate } from 'react-router-dom'
import LineItem from './LineItem'
import { useSpecialDetailsForm } from './formHandlers'

export default function SpecialDetailsCard({
  formData,
  setFormData,
  isEditMode = false,
  proposalLanguage = 'en',
}) {
  const navigate = useNavigate()
  const { templates, handleTemplateSelect, handleAddBlank, handleLineItemChange, handleRemove } =
    useSpecialDetailsForm(formData, setFormData, isEditMode, proposalLanguage)

  const reactSelectOptions = templates.map((t) => ({
    value: t.id,
    label: `${t.serviceTitle} (${t.serviceCode})${t.proposalLanguage === 'ms-MY' ? ' [BM]' : ''}`,
    serviceTitle: t.serviceTitle,
    serviceCode: t.serviceCode,
  }))

  const handleSelectChange = (selected) => {
    if (!selected) {
      handleTemplateSelect({ target: { value: '' } })
    } else {
      handleTemplateSelect({ target: { value: selected.value } })
    }
  }

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Special Service Details</strong>
        </CCardHeader>
        <CCardBody>
          {isEditMode && (
            <CAlert color="primary">
              <strong>
                {new URLSearchParams(window.location.search).get('isRevision') === 'true'
                  ? 'You are revising the existing quotation. The quotation number will be appended with Rev xx.'
                  : "You are editing the existing quotation. This won't change the quotation number."}
              </strong>
            </CAlert>
          )}

          {/* 1) Service Template */}
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel htmlFor="specialServiceType">Special Service Type</CFormLabel>

              {!isEditMode ? (
                <Select
                  id="specialServiceType"
                  options={reactSelectOptions}
                  value={reactSelectOptions.find((opt) => opt.value === formData.specialId) || null}
                  onChange={handleSelectChange}
                  placeholder="Select special service..."
                  isClearable
                  noOptionsMessage={() => (
                    <span>
                      {proposalLanguage === 'ms-MY'
                        ? 'No reviewed BM special proposals available. Review and save the BM proposal first.'
                        : 'No special services found.'}{' '}
                      <CButton
                        color="primary"
                        size="sm"
                        variant="outline"
                        className="p-1 m-0 align-baseline"
                        onClick={() => navigate('/templates/create')}
                      >
                        Create one?
                      </CButton>
                    </span>
                  )}
                />
              ) : (
                <CFormInput
                  readOnly
                  value={
                    templates.find((t) => t.id === formData.specialId)
                      ? `${templates.find((t) => t.id === formData.specialId).serviceTitle} (${templates.find((t) => t.id === formData.specialId).serviceCode})`
                      : '--'
                  }
                />
              )}
            </CCol>
          </CRow>

          {/* 2) General Remarks */}
          <CRow className="mt-3">
            <CCol>
              <CFormLabel>Quotation Remarks</CFormLabel>
              <CFormTextarea
                rows={2}
                value={formData.generalRemarks || ''}
                onChange={(e) => setFormData((p) => ({ ...p, generalRemarks: e.target.value }))}
                placeholder="Enter any general remarks for the quotation."
              />
            </CCol>
          </CRow>

          {/* 3) Column headers */}
          <CRow className="mt-4 fw-bold align-items-center">
            <CCol md={3}>Item Title</CCol>
            <CCol md={5}>Description</CCol>
            <CCol md={2}>Unit</CCol>
            <CCol md={2}>{/* Remove button col */}</CCol>
          </CRow>

          {/* 4) Line items */}
          {(formData.lineItems || []).map((item, idx) => (
            <LineItem
              key={idx}
              item={item}
              index={idx}
              onChange={handleLineItemChange}
              onRemove={handleRemove}
            />
          ))}

          {/* 5) Add blank */}
          <CRow className="mt-3">
            <CCol>
              <CButton color="primary" variant="outline" size="sm" onClick={handleAddBlank}>
                Add Line Item
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </CCol>
  )
}
