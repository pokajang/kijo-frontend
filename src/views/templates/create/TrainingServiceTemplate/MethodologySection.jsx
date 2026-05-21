import React from 'react'
import { CRow, CCol, CFormLabel, CFormCheck, CFormTextarea } from '@coreui/react'

const MethodologySection = ({ templateDetails, setTemplateDetails, validationErrors = {} }) => {
  // Toggle checkbox values
  const toggleCheck = (field) => {
    setTemplateDetails((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  // Handle input field changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setTemplateDetails((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <CRow className="mb-3">
      <CCol md={12}>
        <CFormLabel>Training Methodology</CFormLabel>
      </CCol>

      <CCol md={6}>
        <CFormCheck
          label="Theory Session"
          checked={templateDetails.method_theory}
          onChange={() => toggleCheck('method_theory')}
        />
        {templateDetails.method_theory && (
          <CFormTextarea
            rows={2}
            className="mb-2"
            name="method_theory_desc"
            value={templateDetails.method_theory_desc}
            onChange={handleChange}
            invalid={Boolean(validationErrors.method_theory_desc)}
            feedbackInvalid={validationErrors.method_theory_desc}
            data-template-field="method_theory_desc"
          />
        )}
      </CCol>

      <CCol md={6}>
        <CFormCheck
          label="Practical Session"
          checked={templateDetails.method_practical}
          onChange={() => toggleCheck('method_practical')}
        />
        {templateDetails.method_practical && (
          <CFormTextarea
            rows={2}
            className="mb-2"
            name="method_practical_desc"
            value={templateDetails.method_practical_desc}
            onChange={handleChange}
            invalid={Boolean(validationErrors.method_practical_desc)}
            feedbackInvalid={validationErrors.method_practical_desc}
            data-template-field="method_practical_desc"
          />
        )}
      </CCol>
    </CRow>
  )
}

export default MethodologySection
