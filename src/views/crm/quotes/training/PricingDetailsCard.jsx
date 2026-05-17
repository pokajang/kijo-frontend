// crm/quotes/training/PricingDetailsCard.jsx

import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CAlert,
  CButton,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CFormCheck,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import {
  getTrainingRateOption,
  getTrainingTravelRegion,
  trainingRateOptions,
  trainingTravelRegionOptions,
} from './trainingRates'

const money = (value) =>
  Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const PricingDetailsCard = ({
  formData,
  setFormData,
  onRequestOverride,
  appliedPriceException = null,
}) => {
  const selectedRate = getTrainingRateOption(formData.trainingRateType)
  const selectedTravelRegion = getTrainingTravelRegion(formData.travelRegion)
  const isPerPaxMode = formData.pricingBasis === 'per_pax'
  const unitLabel = formData.durationUnit.replace('(s)', '').trim()
  const unitPriceSuffix = formData.pricingBasis === 'per_pax' ? 'per pax' : `per ${unitLabel}`
  const hasAppliedNegotiation = Boolean(appliedPriceException)
  const travelRateLabel =
    selectedTravelRegion.amount > 0
      ? `Mob. & accom. minimum: RM ${money(selectedTravelRegion.amount)} (${selectedTravelRegion.label})`
      : 'Mob. & accom. minimum: RM 0.00'
  const enforceRateFloors = () => {
    setFormData((prev) => {
      const rate = getTrainingRateOption(prev.trainingRateType)
      const region = getTrainingTravelRegion(prev.travelRegion)
      return {
        ...prev,
        unitPrice:
          rate.unitCost > 0 && Number(prev.unitPrice || 0) < rate.unitCost
            ? rate.unitCost
            : prev.unitPrice,
        travelCharge:
          region.amount > 0 && Number(prev.travelCharge || 0) < region.amount
            ? region.amount
            : prev.travelCharge,
        mealPrice:
          prev.mealsProvided === 'Yes' &&
          rate.mealUnitCost > 0 &&
          Number(prev.mealPrice || 0) < rate.mealUnitCost
            ? rate.mealUnitCost
            : prev.mealPrice,
      }
    })
  }

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Pricing Details</strong>
        </CCardHeader>
        <CCardBody>
          <CForm className="row g-3">
            <CCol md={6}>
              <CFormLabel htmlFor="trainingRateType">Pricing Category</CFormLabel>
              <CFormSelect
                id="trainingRateType"
                value={formData.trainingRateType || selectedRate.value}
                onChange={(e) => {
                  const rate = getTrainingRateOption(e.target.value)
                  setFormData((prev) => ({
                    ...prev,
                    trainingRateType: rate.value,
                    pricingBasis: rate.pricingBasis || 'per_session',
                    trainingQty: 1,
                    trainingDuration: 1,
                    durationUnit: 'day(s)',
                    noOfPax: rate.pricingBasis === 'per_pax' ? 1 : prev.noOfPax || 25,
                    unitPrice: rate.unitCost,
                    mealsProvided: rate.mealUnitCost > 0 ? 'Yes' : prev.mealsProvided,
                    mealPrice: rate.mealUnitCost > 0 ? rate.mealUnitCost : prev.mealPrice,
                  }))
                }}
              >
                {trainingRateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={6}>
              <CFormLabel htmlFor="travelRegion">Travel Region</CFormLabel>
              <CFormSelect
                id="travelRegion"
                value={formData.travelRegion || selectedTravelRegion.value}
                onChange={(e) => {
                  const region = getTrainingTravelRegion(e.target.value)
                  setFormData((prev) => ({
                    ...prev,
                    travelRegion: region.value,
                    travelCharge: region.amount,
                  }))
                }}
              >
                {trainingTravelRegionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol xs={12}>
              <CAlert
                color={selectedRate.requiresManagementApproval ? 'warning' : 'info'}
                className="d-flex align-items-center justify-content-between gap-2 mb-0"
              >
                <span>
                  <strong>{selectedRate.label}</strong>
                  {selectedRate.rateLabel ? `: ${selectedRate.rateLabel}` : ''}
                  <span className="d-block">{travelRateLabel}</span>
                </span>
                {selectedRate.requiresManagementApproval && (
                  <CButton color="warning" size="sm" onClick={onRequestOverride}>
                    Request Override
                  </CButton>
                )}
              </CAlert>
            </CCol>

            {hasAppliedNegotiation && (
              <CCol xs={12}>
                <CAlert color="success" className="mb-0">
                  <strong>Approved negotiation applied.</strong> Training base rates remain locked
                  at the configured unit, travel/accommodation, and meal rates. RM{' '}
                  {money(formData.discountValue)} is applied as the approved discount and will
                  replace any existing discount when saved.
                </CAlert>
              </CCol>
            )}

            <CCol md={12}>
              <CFormLabel className="d-block">Pricing Basis</CFormLabel>
              <div className="d-flex gap-4">
                <CFormCheck
                  id="pricingBasisPerSession"
                  type="radio"
                  name="pricingBasis"
                  label="Per Session / Class"
                  checked={(formData.pricingBasis || 'per_session') === 'per_session'}
                  disabled
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      pricingBasis: 'per_session',
                      trainingQty: 1,
                      trainingDuration: 1,
                      durationUnit: 'day(s)',
                      noOfPax: 25,
                      unitPrice: prev.trainingTypeOption === 'Online' ? 3500 : 4500,
                    }))
                  }
                />
                <CFormCheck
                  id="pricingBasisPerPax"
                  type="radio"
                  name="pricingBasis"
                  label="Per Pax"
                  checked={formData.pricingBasis === 'per_pax'}
                  disabled
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      pricingBasis: 'per_pax',
                      trainingQty: 1,
                      trainingDuration: 1,
                      noOfPax: 1,
                      unitPrice: 888,
                    }))
                  }
                />
              </div>
            </CCol>

            {/* Quantity */}
            {!isPerPaxMode && (
              <CCol md={3}>
                <CFormLabel htmlFor="trainingQty">Quantity</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    id="trainingQty"
                    min="1"
                    value={formData.trainingQty}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        trainingQty: Number(e.target.value),
                      }))
                    }
                  />
                  <CInputGroupText>session(s)</CInputGroupText>
                </CInputGroup>
              </CCol>
            )}

            {/* Duration */}
            {!isPerPaxMode && (
              <CCol md={3}>
                <CFormLabel htmlFor="trainingDuration">Duration</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    id="trainingDuration"
                    min="1"
                    value={formData.trainingDuration}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        trainingDuration: Number(e.target.value),
                      }))
                    }
                  />
                  <CFormSelect
                    value={formData.durationUnit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        durationUnit: e.target.value,
                      }))
                    }
                  >
                    <option value="day(s)">day(s)</option>
                    <option value="hour(s)">hour(s)</option>
                  </CFormSelect>
                </CInputGroup>
              </CCol>
            )}

            {/* No. of Pax */}
            <CCol md={3}>
              <CFormLabel htmlFor="noOfPax">No. of Pax</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  id="noOfPax"
                  min="1"
                  value={formData.noOfPax}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      noOfPax: Number(e.target.value),
                    }))
                  }
                />
                <CInputGroupText>pax</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* Unit Price */}
            <CCol md={3}>
              <CFormLabel htmlFor="unitPrice">Unit Price</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  id="unitPrice"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unitPrice: e.target.value,
                    }))
                  }
                  onBlur={enforceRateFloors}
                />
                <CInputGroupText>{unitPriceSuffix}</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* Mobilization Cost */}
            <CCol md={3}>
              <CFormLabel htmlFor="travelCharge">Mob. & Accom. Costs</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  id="travelCharge"
                  value={formData.travelCharge}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      travelCharge: e.target.value,
                    }))
                  }
                  onBlur={enforceRateFloors}
                />
                <CInputGroupText>sum</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* Meals */}
            <CCol md={3}>
              <CFormLabel htmlFor="participantsMeals">Participants Meals</CFormLabel>
              <CFormSelect
                id="participantsMeals"
                value={formData.mealsProvided}
                onChange={(e) => {
                  const selected = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    mealsProvided: selected,
                    mealPrice: selected === 'No' ? '' : prev.mealPrice,
                  }))
                }}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </CFormSelect>

              {/* Meal Price if Yes */}
              {formData.mealsProvided === 'Yes' && (
                <CInputGroup className="mt-2">
                  <CFormInput
                    type="number"
                    id="mealPrice"
                    placeholder="Enter meal cost"
                    value={formData.mealPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mealPrice: e.target.value,
                      }))
                    }
                    onBlur={enforceRateFloors}
                  />
                  <CInputGroupText>per pax per day</CInputGroupText>
                </CInputGroup>
              )}
            </CCol>

            {/* Discount Type */}
            <CCol md={3}>
              <CFormLabel htmlFor="discountType">Discount Type</CFormLabel>
              <CFormSelect
                id="discountType"
                value={formData.discountType}
                disabled={hasAppliedNegotiation}
                onChange={(e) => {
                  const selected = e.target.value
                  let discountValue = ''

                  if (selected === 'No Discount') discountValue = 0
                  else if (selected === 'One-Off') discountValue = 200
                  else if (selected === 'Introductory') discountValue = 300
                  else if (selected === 'Special') discountValue = ''
                  else discountValue = ''

                  setFormData((prev) => ({
                    ...prev,
                    discountType: selected,
                    discountValue,
                  }))
                }}
              >
                <option value="">Choose discount</option>
                <option value="No Discount">No Discount</option>
                <option value="One-Off">One-Off</option>
                <option value="Introductory">Introductory</option>
                <option value="Special">Special</option>
                {formData.discountType === 'Negotiated' && (
                  <option value="Negotiated">Negotiated</option>
                )}
              </CFormSelect>
            </CCol>

            {/* Discount Value */}
            <CCol md={3}>
              <CFormLabel htmlFor="discountValue">Discount Value</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  id="discountValue"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }))
                  }
                  disabled={!formData.discountType}
                  readOnly={hasAppliedNegotiation}
                  placeholder={formData.discountType === 'Special' ? 'Insert amount' : ''}
                />
                <CInputGroupText>MYR</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* SST Rate */}
            <CCol md={2}>
              <CFormLabel htmlFor="sstRate">SST Rate</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  id="sstRate"
                  value={formData.sstRate}
                  min="0"
                  step="4"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sstRate: e.target.value,
                    }))
                  }
                />
                <CInputGroupText>%</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* HRD Charge */}
            <CCol md={2}>
              <CFormLabel htmlFor="hrdCharge">HRD Charge</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  id="hrdCharge"
                  value={formData.hrdCharge}
                  min="0"
                  step="1"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hrdCharge: e.target.value,
                    }))
                  }
                />
                <CInputGroupText>%</CInputGroupText>
              </CInputGroup>
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default PricingDetailsCard
