import React from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CFormText,
} from '@coreui/react'
import {
  getHygieneComplexityMultiplier,
  LEGACY_HYGIENE_PRICING_RULE,
} from '../../../../shared/invoice/hygienePricing'

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
  const isLegacyPricing = formData.pricingRuleVersion === LEGACY_HYGIENE_PRICING_RULE
  const complexityMultiplier = getHygieneComplexityMultiplier(formData.complexityRating)

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

      {isLegacyPricing && (
        <CCol md={4}>
          <CFormLabel>Legacy Complexity Rating</CFormLabel>
          <CFormInput
            name="complexityRating"
            type="number"
            min="1"
            max="5"
            value={formData.complexityRating}
            disabled
            readOnly
          />
          <CFormText>
            Preserved from the original quotation ({complexityMultiplier.toFixed(1)}× pricing).
          </CFormText>
        </CCol>
      )}
    </CRow>
  )
}

export default ProjectDetailsCard
