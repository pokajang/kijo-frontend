import React, { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import TrainingInvoiceForm from './TrainingInvoiceForm'

const basePricing = {
  training_total: 0,
  training_qty: 1,
  training_unit: 'Lot',
  meal_total: 0,
  meal_qty: 1,
  meal_unit: 'Lot',
  mobilization_cost: 0,
  mobilization_qty: 1,
  mobilization_unit: 'Lot',
  discount_amount: 0,
  discount_qty: 1,
  discount_unit: 'Lot',
  subtotal: 0,
  sst_rate: 0,
  sst_amount: 0,
  grand_total: 0,
  hrd_rate: 0,
  hrd_amount: 0,
  hrd_qty: 1,
  hrd_unit: 'Lot',
  training_items: [],
  remarks: '',
}

const hrdQuoteDetails = {
  id: 77,
  payment_method: 'HRD Grant',
  training_total: 4500,
  meal_total: 0,
  mobilization_cost: 0,
  discount_amount: 300,
  hrd_charge: 0,
  hrd_amount: 0,
  subtotal: 4200,
  sst_rate: 0,
  sst_amount: 0,
  grand_total: 4200,
}

const renderTrainingInvoiceForm = () => {
  const Harness = () => {
    const [pricing, setPricing] = useState(basePricing)

    return (
      <TrainingInvoiceForm
        quoteDetails={hrdQuoteDetails}
        pricing={pricing}
        setPricing={setPricing}
        paymentMethod="hrd grant"
      />
    )
  }

  render(<Harness />)
}

describe('TrainingInvoiceForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps training quote values populated and defaults HRD rate when quote HRD charge is missing', async () => {
    renderTrainingInvoiceForm()

    await waitFor(() => {
      expect(screen.getByDisplayValue('4500')).toBeInTheDocument()
      expect(screen.getByDisplayValue('300')).toBeInTheDocument()
      expect(screen.getByText('HRD Charge (4% of training net)')).toBeInTheDocument()
      expect(screen.getByDisplayValue('168')).toBeInTheDocument()
      expect(screen.getByText('4368.00')).toBeInTheDocument()
    })
  })
})
