import React from 'react'
import { CRow, CCol, CFormLabel, CFormInput, CFormSelect, CInputGroup } from '@coreui/react'

const SAMPLE_UNITS = [
  'chemical(s)',
  'sample(s)',
  'lot(s)',
  'lump sum',
  'system(s)',
  'point(s)',
  'observation(s)',
  'parameter(s)',
  'pax(s)',
  'unit(s)',
  'pc(s)',
]

const ProjectDetailsCard = ({ formData, setFormData }) => {
  return (
    <CRow className="g-3 mb-3">
      <CCol md={4}>
        <CFormLabel>Sample Counts</CFormLabel>
        <CInputGroup>
          <CFormInput
            name="sampleCounts"
            type="number"
            value={formData.sampleCounts}
            onChange={(e) => setFormData((prev) => ({ ...prev, sampleCounts: e.target.value }))}
          />
          <CFormSelect
            name="sampleUnit"
            value={formData.sampleUnit ?? 'sample(s)'}
            onChange={(e) => setFormData((prev) => ({ ...prev, sampleUnit: e.target.value }))}
          >
            {SAMPLE_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </CFormSelect>
        </CInputGroup>
      </CCol>

      <CCol md={4}>
        <CFormLabel>No. of Work Units (optional)</CFormLabel>
        <CFormInput
          name="numWorkUnits"
          type="number"
          min="1"
          value={formData.numWorkUnits}
          placeholder="Leave blank if not applicable"
          onChange={(e) => setFormData((prev) => ({ ...prev, numWorkUnits: e.target.value }))}
        />
      </CCol>
    </CRow>
  )
}

export default ProjectDetailsCard
