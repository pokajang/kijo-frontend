import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'

const VendorLoaEditModal = ({ visible, record, submitting = false, onClose, onSave }) => {
  const [draft, setDraft] = useState({
    award_value: '',
    payment_terms: '',
    position: '',
    services_description: '',
    venue_details: '',
    fee_breakdown: '',
    remarks: '',
  })

  useEffect(() => {
    if (!record) return
    setDraft({
      award_value: record.award_value || '',
      payment_terms: record.payment_terms || '',
      position: record.position || '',
      services_description: record.services_description || '',
      venue_details: record.venue_details || '',
      fee_breakdown: record.fee_breakdown || '',
      remarks: record.remarks || '',
    })
  }, [record])

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = () => {
    onSave?.({
      ...record,
      ...draft,
      award_value: Number(draft.award_value),
    })
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>Edit Vendor LOA</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12} md={6}>
            <CFormLabel>LOA</CFormLabel>
            <CFormInput value={record?.loa_ref_no || '-'} disabled />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Vendor</CFormLabel>
            <CFormInput value={record?.vendor_name || '-'} disabled />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Project</CFormLabel>
            <CFormInput value={record?.project_name || '-'} disabled />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Award Value</CFormLabel>
            <CFormInput
              type="number"
              min="0.01"
              step="0.01"
              value={draft.award_value}
              onChange={(event) => updateDraft('award_value', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Payment Terms</CFormLabel>
            <CFormInput
              value={draft.payment_terms}
              onChange={(event) => updateDraft('payment_terms', event.target.value)}
              placeholder="e.g. 30 days"
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Position</CFormLabel>
            <CFormInput
              value={draft.position}
              onChange={(event) => updateDraft('position', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Services Description</CFormLabel>
            <CFormTextarea
              rows={3}
              value={draft.services_description}
              onChange={(event) => updateDraft('services_description', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Venue Details</CFormLabel>
            <CFormTextarea
              rows={3}
              value={draft.venue_details}
              onChange={(event) => updateDraft('venue_details', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Fee Breakdown</CFormLabel>
            <CFormTextarea
              rows={3}
              value={draft.fee_breakdown}
              onChange={(event) => updateDraft('fee_breakdown', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel>Remarks</CFormLabel>
            <CFormTextarea
              rows={3}
              value={draft.remarks}
              onChange={(event) => updateDraft('remarks', event.target.value)}
            />
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          variant="outline"
          onClick={handleSubmit}
          disabled={
            submitting ||
            !Number.isFinite(Number(draft.award_value)) ||
            Number(draft.award_value) <= 0
          }
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default VendorLoaEditModal
