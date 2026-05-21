import React from 'react'
import { CRow, CCol, CFormLabel, CFormTextarea } from '@coreui/react'

const TrainingRequirementsSection = ({
  templateDetails,
  setTemplateDetails,
  validationErrors = {},
}) => {
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
          invalid={Boolean(validationErrors.trainingRequirements)}
          feedbackInvalid={validationErrors.trainingRequirements}
          data-template-field="trainingRequirements"
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
          invalid={Boolean(validationErrors.additionalTrainingRequirements)}
          feedbackInvalid={validationErrors.additionalTrainingRequirements}
          data-template-field="additionalTrainingRequirements"
        />
      </CCol>
      <CCol md={6} className="mb-3">
        <CFormLabel>Training Materials</CFormLabel>
        <CFormTextarea
          rows={2}
          name="trainingMaterials"
          value={templateDetails.trainingMaterials}
          onChange={handleChange}
          invalid={Boolean(validationErrors.trainingMaterials)}
          feedbackInvalid={validationErrors.trainingMaterials}
          data-template-field="trainingMaterials"
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
          invalid={Boolean(validationErrors.lectureMedium)}
          feedbackInvalid={validationErrors.lectureMedium}
          data-template-field="lectureMedium"
        />
      </CCol>
    </CRow>
  )
}

export default TrainingRequirementsSection
