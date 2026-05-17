// src/crm/quotes/manpower/PricingCard.jsx
import React, { useEffect } from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CAlert,
  CButton,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import { calculateManpowerTotals, getManpowerRate, getManpowerRateOption } from './manpowerRates'

const money = (value) =>
  Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/**
 * Unit Cost, Discount, SST %, and auto-computed Subtotal / SST Amount / Grand Total.
 * Subtotal formula: unitCost x noOfPax x duration quantity - discount.
 */
export default function PricingCard({
  formData,
  setFormData,
  onRequestOverride,
  appliedPriceException = null,
}) {
  const activeRate = getManpowerRate({
    rateType: formData.manpowerRateType,
    durationMonths: formData.durationMonths,
  })
  const activeRateOption = getManpowerRateOption(formData.manpowerRateType)
  const isHourly = formData.billingUnit === 'hour'
  const unitCostLabel = isHourly ? 'Unit Cost (per pax per hour)' : 'Unit Cost (per pax per month)'
  const minimumUnitCost =
    activeRate.unitCost > 0 && !formData.requiresManagementApproval ? activeRate.unitCost : 0
  const isBelowMinimum =
    minimumUnitCost > 0 &&
    formData.unitCost !== '' &&
    Number(formData.unitCost || 0) < minimumUnitCost
  const hasAppliedNegotiation = Boolean(appliedPriceException)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleUnitCostBlur = () => {
    if (!isBelowMinimum) return

    setFormData((prev) => ({
      ...prev,
      unitCost: minimumUnitCost,
    }))
  }

  useEffect(() => {
    const totals = calculateManpowerTotals({
      unitCost: formData.unitCost,
      noOfPax: formData.noOfPax,
      durationMonths: formData.durationMonths,
      durationHours: formData.durationHours,
      billingUnit: formData.billingUnit,
      discount: formData.discount,
      sstPercent: formData.sstPercent,
    })

    setFormData((prev) => ({
      ...prev,
      ...totals,
    }))
  }, [
    formData.unitCost,
    formData.noOfPax,
    formData.durationMonths,
    formData.durationHours,
    formData.billingUnit,
    formData.discount,
    formData.sstPercent,
    setFormData,
  ])

  return (
    <>
      {activeRateOption && (
        <CAlert
          color={formData.requiresManagementApproval ? 'warning' : 'info'}
          className="mt-3 d-flex align-items-center justify-content-between gap-2"
        >
          <span>
            <strong>{activeRateOption.label}</strong>
            {activeRate.tierLabel ? ` - ${activeRate.tierLabel}` : ''}
            {activeRate.rateLabel ? `: ${activeRate.rateLabel}` : ''}
          </span>
          {formData.requiresManagementApproval && (
            <CButton color="warning" size="sm" onClick={onRequestOverride}>
              Request Override
            </CButton>
          )}
        </CAlert>
      )}

      {hasAppliedNegotiation && (
        <CAlert color="success" className="mt-3 mb-0">
          <strong>Approved negotiation applied.</strong> Base rate remains locked at the configured
          manpower rate. RM {money(formData.discount)} is applied as the approved discount and will
          replace any existing discount when saved.
        </CAlert>
      )}

      <CRow className="g-3 mt-3">
        <CCol md={4}>
          <CFormLabel>{unitCostLabel}</CFormLabel>
          <CInputGroup>
            <CFormInput
              name="unitCost"
              type="number"
              min={minimumUnitCost}
              step="0.01"
              value={formData.unitCost ?? ''}
              onChange={handleChange}
              onBlur={handleUnitCostBlur}
              placeholder="0.00"
              invalid={isBelowMinimum}
            />
            <CInputGroupText>{isHourly ? 'hour' : 'month'}</CInputGroupText>
          </CInputGroup>
        </CCol>
        <CCol md={4}>
          <CFormLabel>Discount (RM)</CFormLabel>
          <CFormInput
            name="discount"
            type="number"
            min="0"
            step="0.01"
            value={formData.discount ?? ''}
            onChange={handleChange}
            readOnly={hasAppliedNegotiation}
            placeholder="0.00"
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel>SST (%)</CFormLabel>
          <CFormInput
            name="sstPercent"
            type="number"
            min="0"
            step="0.01"
            value={formData.sstPercent ?? ''}
            onChange={handleChange}
            placeholder="0.00"
          />
        </CCol>
      </CRow>

      <CRow className="g-3 mt-3">
        <CCol md={4}>
          <CFormLabel>Subtotal (RM)</CFormLabel>
          <CFormInput name="subTotal" type="text" readOnly value={formData.subTotal ?? ''} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>SST Amount (RM)</CFormLabel>
          <CFormInput name="sstAmount" type="text" readOnly value={formData.sstAmount ?? ''} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Grand Total (RM)</CFormLabel>
          <CFormInput name="grandTotal" type="text" readOnly value={formData.grandTotal ?? ''} />
        </CCol>
      </CRow>
    </>
  )
}
