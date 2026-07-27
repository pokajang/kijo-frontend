import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import PricingDetailsCard from './PricingDetailsCard'

const baseFormData = {
  paymentMethod: 'HRD Grant',
  trainingRateType: 'client_site_normal',
  travelRegion: 'none',
  pricingBasis: 'per_session',
  durationUnit: 'day(s)',
  trainingTypeOption: 'Physical',
  trainingQty: 1,
  trainingDuration: 1,
  noOfPax: 25,
  unitPrice: 4500,
  travelCharge: 0,
  mealsProvided: 'No',
  mealPrice: '',
  discountType: 'No Discount',
  discountValue: 0,
  sstRate: 0,
  hrdCharge: 0,
  priceExceptionRequestId: '',
}

const renderPricing = (formData, setFormData = vi.fn()) => {
  render(
    <PricingDetailsCard
      formData={formData}
      setFormData={setFormData}
      onRequestOverride={vi.fn()}
      quoteGrandTotal={4500}
    />,
  )

  return { setFormData }
}

describe('PricingDetailsCard HRD rate', () => {
  afterEach(() => {
    cleanup()
  })

  it('enables an explicit zero-rate input for HRD Grant payment', () => {
    renderPricing(baseFormData)

    expect(screen.getByLabelText('HRD Charge')).toBeEnabled()
    expect(screen.getByLabelText('HRD Charge')).toHaveValue(0)
    expect(
      screen.getByText('Enter the applicable HRD rate. No rate is applied automatically.'),
    ).toBeInTheDocument()
  })

  it('disables the HRD rate input for non-HRD payment', () => {
    renderPricing({
      ...baseFormData,
      paymentMethod: 'Self-Payment',
    })

    expect(screen.getByLabelText('HRD Charge')).toBeDisabled()
  })

  it('normalizes a negative HRD rate to zero on blur', () => {
    const formData = {
      ...baseFormData,
      hrdCharge: -4,
    }
    let nextFormData
    const setFormData = vi.fn((updateFormData) => {
      nextFormData = updateFormData(formData)
    })
    renderPricing(formData, setFormData)

    fireEvent.blur(screen.getByLabelText('HRD Charge'))

    expect(nextFormData.hrdCharge).toBe(0)
  })
})
