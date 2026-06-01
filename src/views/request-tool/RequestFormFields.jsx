import React from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'

/**
 * RequestFormFields
 *
 * Renders the asset request form fields and action buttons.
 */
export default function RequestFormFields({
  requestData,
  handleChange,
  handleSubmitClick,
  handleCancel,
}) {
  return (
    <>
      <CAlert color="primary" dismissible>
        For work-related purposes only. Use for personal gain is not allowed.
      </CAlert>

      <CForm
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmitClick()
        }}
      >
        <CRow className="mb-3 align-items-center g-3">
          <CCol xs={12} md={8}>
            <CFormLabel htmlFor="equipmentDetail">Equipment Detail</CFormLabel>
            <CFormTextarea
              id="equipmentDetail"
              rows={1}
              placeholder="e.g., Laptop ASUS TUF, Projector Elba..."
              value={requestData.equipmentDetail}
              onChange={handleChange('equipmentDetail')}
            />
          </CCol>

          <CCol xs={6} md={2}>
            <CFormLabel htmlFor="useStartDate">Use Start Date</CFormLabel>
            <CFormInput
              id="useStartDate"
              type="date"
              value={requestData.useStartDate}
              onChange={handleChange('useStartDate')}
            />
          </CCol>

          <CCol xs={6} md={2}>
            <CFormLabel htmlFor="useEndDate">Use End Date</CFormLabel>
            <CFormInput
              id="useEndDate"
              type="date"
              value={requestData.useEndDate}
              onChange={handleChange('useEndDate')}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 g-3">
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="purpose">Purpose of Use</CFormLabel>
            <CFormTextarea
              id="purpose"
              rows={2}
              placeholder="e.g., Completing report writing for project ABC..."
              value={requestData.purpose}
              onChange={handleChange('purpose')}
            />
          </CCol>

          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="remarks">Remarks</CFormLabel>
            <CFormTextarea
              id="remarks"
              rows={2}
              placeholder="e.g., Too much workload at the office..."
              value={requestData.remarks}
              onChange={handleChange('remarks')}
            />
          </CCol>
        </CRow>

        <CRow>
          <CCol className="d-flex justify-content-end gap-2">
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" type="submit">
              Submit Request
            </CButton>
          </CCol>
        </CRow>
      </CForm>
    </>
  )
}
