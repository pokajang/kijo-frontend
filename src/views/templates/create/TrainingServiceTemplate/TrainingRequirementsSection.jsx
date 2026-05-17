import React from 'react'
import { CRow, CCol, CFormLabel, CFormTextarea } from '@coreui/react'

const TrainingRequirementsSection = ({ templateDetails, setTemplateDetails }) => {
  const handleChange = (e) => {
    const { name, value } = e.target
    setTemplateDetails((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <CRow>
      <CCol md={6} className="mb-3">
        <CFormLabel>Training Requirements</CFormLabel>
        <CFormTextarea
          rows={2}
          name="trainingRequirements"
          value={templateDetails.trainingRequirements}
          onChange={handleChange}
        />
      </CCol>
      <CCol md={6} className="mb-3">
        <CFormLabel>Additional Training Requirements (If any)</CFormLabel>
        <CFormTextarea
          rows={2}
          name="additionalTrainingRequirements"
          value={templateDetails.additionalTrainingRequirements}
          onChange={handleChange}
          placeholder="e.g. Work at height platform, scaffolding, etc."
        />
      </CCol>
      <CCol md={6} className="mb-3">
        <CFormLabel>Training Materials</CFormLabel>
        <CFormTextarea
          rows={2}
          name="trainingMaterials"
          value={templateDetails.trainingMaterials}
          onChange={handleChange}
        />
      </CCol>
      <CCol md={6} className="mb-3">
        <CFormLabel>Lecture Medium</CFormLabel>
        <CFormTextarea
          rows={2}
          name="lectureMedium"
          value={templateDetails.lectureMedium}
          onChange={handleChange}
          placeholder="e.g. English & Bahasa Malaysia"
        />
      </CCol>
    </CRow>
  )
}

export default TrainingRequirementsSection
