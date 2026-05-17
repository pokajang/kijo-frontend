import React from 'react'
import { CRow, CCol, CFormLabel, CFormTextarea, CFormInput } from '@coreui/react'

/**
 * Nature of Work, Site Location, Duration (months) & No. of Pax
 */
export default function ProjectDetailsCard({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  const isHourly = formData.billingUnit === 'hour'

  return (
    <>
      <CRow className="mb-3">
        <CCol md={6}>
          <CFormLabel>Nature of Work</CFormLabel>
          <CFormTextarea
            name="natureOfWork"
            rows={3}
            maxLength={300} // 🔹 limit characters
            value={formData.natureOfWork || ''}
            onChange={handleChange}
            placeholder="Briefly describe the nature of the project or work..."
            style={{ resize: 'none' }} // prevent resizing
          />
          <small className="text-muted">{formData.natureOfWork?.length || 0}/300 characters</small>
        </CCol>

        <CCol md={6}>
          <CFormLabel>Site Location</CFormLabel>
          <CFormTextarea
            name="siteLocation"
            rows={3}
            maxLength={200} // 🔹 limit characters
            value={formData.siteLocation || ''}
            onChange={handleChange}
            placeholder="Full address of the site location (district, state)..."
            style={{ resize: 'none' }}
          />
          <small className="text-muted">{formData.siteLocation?.length || 0}/200 characters</small>
        </CCol>
      </CRow>

      <CRow className="g-3 mb-3">
        <CCol md={6}>
          <CFormLabel>{isHourly ? 'Duration (hours)' : 'Duration (months)'}</CFormLabel>
          <CFormInput
            name={isHourly ? 'durationHours' : 'durationMonths'}
            type="number"
            min="0"
            step={isHourly ? '0.5' : '1'}
            value={isHourly ? (formData.durationHours ?? '') : (formData.durationMonths ?? '')}
            onChange={handleChange}
            placeholder={isHourly ? 'e.g. 8' : 'e.g. 6'}
          />
          {!isHourly && (
            <small className="text-muted">
              3S and SHO rates switch to the lower tier when duration is more than 6 months.
            </small>
          )}
        </CCol>

        <CCol md={6}>
          <CFormLabel>No. of Pax</CFormLabel>
          <CFormInput
            name="noOfPax"
            type="number"
            min="0"
            value={formData.noOfPax ?? ''}
            onChange={handleChange}
            placeholder="Number of personnel"
          />
        </CCol>

        <CCol md={12}>
          <CFormLabel>Inquiry Remarks (if any)</CFormLabel>
          <CFormTextarea
            name="inquiryRemarks"
            rows={2}
            maxLength={200} // 🔹 limit characters
            value={formData.inquiryRemarks ?? ''}
            onChange={handleChange}
            placeholder="Briefly describe any specific requirements or remarks..."
            style={{ resize: 'none' }}
          />
          <small className="text-muted">
            {formData.inquiryRemarks?.length || 0}/200 characters
          </small>
        </CCol>
      </CRow>
    </>
  )
}
