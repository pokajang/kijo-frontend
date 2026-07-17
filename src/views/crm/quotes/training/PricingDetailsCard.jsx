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
  getTrainingUnitPriceForDurationUnit,
  shouldApplyTrainingRateFloors,
  trainingRateOptions,
  trainingTravelRegionOptions,
} from './trainingRates'

const money = (value) =>
  Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const labels = {
  en: {
    title: 'Pricing Details',
    pricingCategory: 'Pricing Category',
    travelRegion: 'Travel Region',
    travelMinimum: 'Mob. & accom. minimum',
    floorExemption:
      'Configured minimums are not applied for this pricing category, online training, or hourly training.',
    approvalRequired: 'Approval Required',
    managementApprovalBody:
      'This category needs an approved quote negotiation before it can be saved.',
    negotiationTitle: 'Approved negotiation applied.',
    negotiationBody:
      'Training base rates remain locked at the configured unit, travel/accommodation, and meal rates.',
    negotiationDiscount:
      'is applied as the approved discount and will replace any existing discount when saved.',
    pricingBasis: 'Pricing Basis',
    perSession: 'Per Session / Class',
    perPax: 'Per Pax',
    quantity: 'Quantity',
    duration: 'Duration',
    noOfPax: 'No. of Pax',
    unitPrice: 'Unit Price',
    travelCharge: 'Mob. & Accom. Costs',
    participantsMeals: 'Participants Meals',
    mealPlaceholder: 'Enter meal cost',
    discountType: 'Discount Type',
    discountValue: 'Discount Value',
    sstRate: 'SST Rate',
    hrdCharge: 'HRD Charge',
    chooseDiscount: 'Choose discount',
    noDiscount: 'No Discount',
    oneOff: 'One-Off',
    introductory: 'Introductory',
    special: 'Special',
    negotiated: 'Negotiated',
    insertAmount: 'Insert amount',
    sessionUnit: 'session(s)',
    paxUnit: 'pax',
    sumUnit: 'sum',
    mealUnit: 'per pax per day',
    dayUnit: 'day(s)',
    hourUnit: 'hour(s)',
    yes: 'Yes',
    no: 'No',
    per: 'per',
    perPaxSuffix: 'per pax',
  },
  bm: {
    title: 'Butiran Harga',
    pricingCategory: 'Kategori Harga',
    travelRegion: 'Wilayah Perjalanan',
    travelMinimum: 'Minimum mob. & penginapan',
    floorExemption:
      'Minimum yang ditetapkan tidak digunakan untuk kategori harga ini, latihan dalam talian, atau latihan mengikut jam.',
    approvalRequired: 'Kelulusan Diperlukan',
    managementApprovalBody:
      'Kategori ini memerlukan rundingan sebut harga yang diluluskan sebelum boleh disimpan.',
    negotiationTitle: 'Rundingan diluluskan.',
    negotiationBody:
      'Kadar asas latihan kekal mengikut unit, perjalanan/penginapan dan makanan yang ditetapkan.',
    negotiationDiscount:
      'digunakan sebagai diskaun yang diluluskan dan akan menggantikan diskaun sedia ada apabila disimpan.',
    pricingBasis: 'Asas Harga',
    perSession: 'Setiap Sesi / Kelas',
    perPax: 'Setiap Peserta',
    quantity: 'Kuantiti',
    duration: 'Tempoh',
    noOfPax: 'Bil. Peserta',
    unitPrice: 'Harga Unit',
    travelCharge: 'Kos Mob. & Penginapan',
    participantsMeals: 'Makanan Peserta',
    mealPlaceholder: 'Masukkan kos makanan',
    discountType: 'Jenis Diskaun',
    discountValue: 'Nilai Diskaun',
    sstRate: 'Kadar SST',
    hrdCharge: 'Caj HRD',
    chooseDiscount: 'Pilih diskaun',
    noDiscount: 'Tiada Diskaun',
    oneOff: 'Sekali Sahaja',
    introductory: 'Pengenalan',
    special: 'Khas',
    negotiated: 'Rundingan',
    insertAmount: 'Masukkan amaun',
    sessionUnit: 'sesi',
    paxUnit: 'peserta',
    sumUnit: 'jumlah',
    mealUnit: 'setiap peserta setiap hari',
    dayUnit: 'hari',
    hourUnit: 'jam',
    yes: 'Ya',
    no: 'Tidak',
    per: 'setiap',
    perPaxSuffix: 'setiap peserta',
  },
}

const discountLabels = (text) => ({
  'No Discount': text.noDiscount,
  'One-Off': text.oneOff,
  Introductory: text.introductory,
  Special: text.special,
  Negotiated: text.negotiated,
})

const PricingDetailsCard = ({
  formData,
  setFormData,
  onRequestOverride,
  appliedPriceException = null,
  proposalLanguage = 'en',
}) => {
  const text = proposalLanguage === 'ms-MY' ? labels.bm : labels.en
  const discountLabelMap = discountLabels(text)
  const selectedRate = getTrainingRateOption(formData.trainingRateType)
  const selectedTravelRegion = getTrainingTravelRegion(formData.travelRegion)
  const isPerPaxMode = formData.pricingBasis === 'per_pax'
  const appliesRateFloors = shouldApplyTrainingRateFloors(formData)
  const durationUnit = formData.durationUnit || 'day(s)'
  const unitLabel = durationUnit === 'hour(s)' ? text.hourUnit : text.dayUnit
  const unitPriceSuffix =
    formData.pricingBasis === 'per_pax' ? text.perPaxSuffix : `${text.per} ${unitLabel}`
  const hasAppliedNegotiation = Boolean(appliedPriceException)
  const hasAppliedApproval =
    hasAppliedNegotiation || Number(formData.priceExceptionRequestId || 0) > 0
  const needsManagementApproval = selectedRate.requiresManagementApproval && !hasAppliedApproval
  const showRateNotice = selectedRate.enforceRateFloors !== false || needsManagementApproval
  const travelRateLabel = (() => {
    if (!appliesRateFloors) return text.floorExemption
    if (selectedTravelRegion.amount > 0) {
      return `${text.travelMinimum}: RM ${money(selectedTravelRegion.amount)} (${selectedTravelRegion.label})`
    }
    return `${text.travelMinimum}: RM 0.00`
  })()
  const enforceRateFloors = () => {
    setFormData((prev) => {
      if (!shouldApplyTrainingRateFloors(prev)) return prev

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
      <CCard className="mb-2">
        <CCardHeader>
          <strong>{text.title}</strong>
        </CCardHeader>
        <CCardBody>
          <CForm className="row g-3">
            <CCol md={6}>
              <CFormLabel htmlFor="trainingRateType">{text.pricingCategory}</CFormLabel>
              <CFormSelect
                id="trainingRateType"
                value={formData.trainingRateType || selectedRate.value}
                onChange={(e) => {
                  const rate = getTrainingRateOption(e.target.value)
                  setFormData((prev) => {
                    const nextPricingBasis = rate.pricingBasis || 'per_session'
                    const appliesRateFloors = shouldApplyTrainingRateFloors({
                      ...prev,
                      pricingBasis: nextPricingBasis,
                      trainingRateType: rate.value,
                    })
                    const travelRegion = getTrainingTravelRegion(prev.travelRegion)
                    const hasMealFloor = appliesRateFloors && rate.mealUnitCost > 0

                    return {
                      ...prev,
                      trainingRateType: rate.value,
                      pricingBasis: nextPricingBasis,
                      trainingQty: 1,
                      trainingDuration: prev.trainingDuration || 1,
                      durationUnit: prev.durationUnit || 'day(s)',
                      noOfPax: nextPricingBasis === 'per_pax' ? 1 : prev.noOfPax || 25,
                      unitPrice: appliesRateFloors ? rate.unitCost : prev.unitPrice,
                      travelCharge: appliesRateFloors ? travelRegion.amount : prev.travelCharge,
                      mealsProvided: appliesRateFloors
                        ? hasMealFloor
                          ? 'Yes'
                          : 'No'
                        : prev.mealsProvided,
                      mealPrice: appliesRateFloors
                        ? hasMealFloor
                          ? rate.mealUnitCost
                          : ''
                        : prev.mealPrice,
                    }
                  })
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
              <CFormLabel htmlFor="travelRegion">{text.travelRegion}</CFormLabel>
              <CFormSelect
                id="travelRegion"
                value={formData.travelRegion || selectedTravelRegion.value}
                onChange={(e) => {
                  const region = getTrainingTravelRegion(e.target.value)
                  setFormData((prev) => ({
                    ...prev,
                    travelRegion: region.value,
                    travelCharge: shouldApplyTrainingRateFloors(prev)
                      ? region.amount
                      : prev.travelCharge,
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

            {showRateNotice && (
              <CCol xs={12}>
                <CAlert
                  color={needsManagementApproval ? 'warning' : 'info'}
                  className="d-flex align-items-center justify-content-between gap-2 mb-0"
                >
                  <span>
                    <strong>{selectedRate.label}</strong>
                    {selectedRate.rateLabel ? `: ${selectedRate.rateLabel}` : ''}
                    {needsManagementApproval && (
                      <span className="d-block">{text.managementApprovalBody}</span>
                    )}
                    <span className="d-block">{travelRateLabel}</span>
                  </span>
                  {needsManagementApproval && (
                    <CButton color="warning" size="sm" onClick={onRequestOverride}>
                      {text.approvalRequired}
                    </CButton>
                  )}
                </CAlert>
              </CCol>
            )}

            {hasAppliedNegotiation && (
              <CCol xs={12}>
                <CAlert color="success" className="mb-0">
                  <strong>{text.negotiationTitle}</strong> {text.negotiationBody} RM{' '}
                  {money(formData.discountValue)} {text.negotiationDiscount}
                </CAlert>
              </CCol>
            )}

            <CCol md={12}>
              <CFormLabel className="d-block">{text.pricingBasis}</CFormLabel>
              <div className="d-flex gap-4">
                <CFormCheck
                  id="pricingBasisPerSession"
                  type="radio"
                  name="pricingBasis"
                  label={text.perSession}
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
                      unitPrice: getTrainingUnitPriceForDurationUnit({
                        durationUnit: 'day(s)',
                        trainingRateType: prev.trainingRateType,
                        trainingTypeOption: prev.trainingTypeOption,
                        fallbackUnitPrice: prev.unitPrice,
                      }),
                    }))
                  }
                />
                <CFormCheck
                  id="pricingBasisPerPax"
                  type="radio"
                  name="pricingBasis"
                  label={text.perPax}
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
                <CFormLabel htmlFor="trainingQty">{text.quantity}</CFormLabel>
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
                  <CInputGroupText>{text.sessionUnit}</CInputGroupText>
                </CInputGroup>
              </CCol>
            )}

            {/* Duration */}
            {!isPerPaxMode && (
              <CCol md={3}>
                <CFormLabel htmlFor="trainingDuration">{text.duration}</CFormLabel>
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
                        unitPrice: getTrainingUnitPriceForDurationUnit({
                          durationUnit: e.target.value,
                          trainingRateType: prev.trainingRateType,
                          trainingTypeOption: prev.trainingTypeOption,
                          fallbackUnitPrice: prev.unitPrice,
                        }),
                      }))
                    }
                  >
                    <option value="day(s)">{text.dayUnit}</option>
                    <option value="hour(s)">{text.hourUnit}</option>
                  </CFormSelect>
                </CInputGroup>
              </CCol>
            )}

            {/* No. of Pax */}
            <CCol md={3}>
              <CFormLabel htmlFor="noOfPax">{text.noOfPax}</CFormLabel>
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
                <CInputGroupText>{text.paxUnit}</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* Unit Price */}
            <CCol md={3}>
              <CFormLabel htmlFor="unitPrice">{text.unitPrice}</CFormLabel>
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
              <CFormLabel htmlFor="travelCharge">{text.travelCharge}</CFormLabel>
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
                <CInputGroupText>{text.sumUnit}</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* Meals */}
            <CCol md={3}>
              <CFormLabel htmlFor="participantsMeals">{text.participantsMeals}</CFormLabel>
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
                <option value="No">{text.no}</option>
                <option value="Yes">{text.yes}</option>
              </CFormSelect>

              {/* Meal Price if Yes */}
              {formData.mealsProvided === 'Yes' && (
                <CInputGroup className="mt-2">
                  <CFormInput
                    type="number"
                    id="mealPrice"
                    placeholder={text.mealPlaceholder}
                    value={formData.mealPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mealPrice: e.target.value,
                      }))
                    }
                    onBlur={enforceRateFloors}
                  />
                  <CInputGroupText>{text.mealUnit}</CInputGroupText>
                </CInputGroup>
              )}
            </CCol>

            {/* Discount Type */}
            <CCol md={3}>
              <CFormLabel htmlFor="discountType">{text.discountType}</CFormLabel>
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
                <option value="">{text.chooseDiscount}</option>
                <option value="No Discount">{discountLabelMap['No Discount']}</option>
                <option value="One-Off">{discountLabelMap['One-Off']}</option>
                <option value="Introductory">{discountLabelMap.Introductory}</option>
                <option value="Special">{discountLabelMap.Special}</option>
                {formData.discountType === 'Negotiated' && (
                  <option value="Negotiated">{discountLabelMap.Negotiated}</option>
                )}
              </CFormSelect>
            </CCol>

            {/* Discount Value */}
            <CCol md={3}>
              <CFormLabel htmlFor="discountValue">{text.discountValue}</CFormLabel>
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
                  placeholder={formData.discountType === 'Special' ? text.insertAmount : ''}
                />
                <CInputGroupText>MYR</CInputGroupText>
              </CInputGroup>
            </CCol>

            {/* SST Rate */}
            <CCol md={2}>
              <CFormLabel htmlFor="sstRate">{text.sstRate}</CFormLabel>
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
              <CFormLabel htmlFor="hrdCharge">{text.hrdCharge}</CFormLabel>
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
