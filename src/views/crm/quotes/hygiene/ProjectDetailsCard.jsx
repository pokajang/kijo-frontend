import React from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CFormText,
  CButton,
} from '@coreui/react'
import {
  getHygieneComplexityMultiplier,
  isHistoricalHygienePricingRule,
  LEGACY_HYGIENE_PRICING_RULE,
  STANDARD_HYGIENE_PRICING_RULE,
} from '../../../../shared/invoice/hygienePricing'
import dialog from '../../../../components/dialog/dialogService'

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
  const isHistoricalPricing = isHistoricalHygienePricingRule(formData.pricingRuleVersion)
  const complexityMultiplier = getHygieneComplexityMultiplier(formData.complexityRating)
  const handleUpgradePricing = async () => {
    const confirmed = await dialog.confirm(
      'Upgrade this historical quotation to current V2 pricing? Its totals will be recalculated and this cannot be undone by an ordinary edit.',
      {
        title: 'Upgrade IH Pricing',
        confirmText: 'Upgrade pricing',
        cancelText: 'Keep historical pricing',
      },
    )
    if (!confirmed) return

    setFormData((prev) => ({
      ...prev,
      pricingRuleVersion: STANDARD_HYGIENE_PRICING_RULE,
      upgradePricingRule: true,
      hygieneItems: [],
      estimatedTotalCost: '',
    }))
  }

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

      {isHistoricalPricing && (
        <CCol xs={12}>
          <CFormText className="d-block mb-2">
            This quotation retains its historical pricing calculation and stored contractual totals.
          </CFormText>
          <CButton type="button" color="warning" variant="outline" onClick={handleUpgradePricing}>
            Upgrade to Current V2 Pricing
          </CButton>
        </CCol>
      )}
    </CRow>
  )
}

export default ProjectDetailsCard
