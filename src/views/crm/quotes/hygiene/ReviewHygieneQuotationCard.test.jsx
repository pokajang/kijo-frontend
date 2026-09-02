import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import ReviewHygieneQuotationCard from './ReviewHygieneQuotationCard'

const selectedClient = {
  company_id: 1,
  company_name: 'Test Client',
  address: 'Main Road',
  city: 'Kajang',
  state: 'Selangor',
}

const baseFormData = {
  serviceTitle: 'Chemical Exposure Monitoring',
  serviceCode: 'cem',
  siteAddress: 'Main Site',
  numWorkUnits: 1,
  sampleCounts: 10,
  sampleUnit: 'sample(s)',
  inquiryRemarks: 'Remarks',
  unitPrice: 500,
  travelCharge: 0,
  discount: 300,
  sstPercent: 0,
  attachProposal: true,
  hygieneItems: [
    {
      id: 1,
      item_description: 'Blank sample',
      description: 'Lab blank',
      quantity: 1,
      unit: 'Lot',
      unit_price: 200,
    },
    {
      id: 2,
      item_description: 'Report writing',
      description: '',
      quantity: 2,
      unit: 'Hour',
      unit_price: 150,
    },
  ],
}

afterEach(() => {
  cleanup()
})

describe('ReviewHygieneQuotationCard', () => {
  it('numbers multiple additional fees and keeps final totals in the review table', () => {
    render(
      <MemoryRouter>
        <ReviewHygieneQuotationCard
          selectedClient={selectedClient}
          formData={baseFormData}
          setFormData={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>,
    )

    const additionalFeesRow = screen.getByText('Additional Fees (RM)').closest('tr')

    expect(within(additionalFeesRow).getByText('Blank sample')).toBeInTheDocument()
    expect(within(additionalFeesRow).getByText('(1 Lot x RM 200.00)')).toBeInTheDocument()
    expect(within(additionalFeesRow).getByText('Notes: Lab blank')).toBeInTheDocument()
    expect(within(additionalFeesRow).getByText('Report writing')).toBeInTheDocument()
    expect(within(additionalFeesRow).getByText('(2 Hour x RM 150.00)')).toBeInTheDocument()

    expect(screen.getByText('Gross Subtotal (RM)')).toBeInTheDocument()
    expect(screen.getByText('Subtotal after Discount (RM)')).toBeInTheDocument()
    expect(screen.getByText('Grand Total (RM)')).toBeInTheDocument()
    expect(screen.getByText('RM 5,500.00')).toBeInTheDocument()
    expect(screen.getAllByText('RM 5,200.00').length).toBeGreaterThan(0)
  })

  it('preserves the archived complexity presentation for legacy quotations', () => {
    render(
      <MemoryRouter>
        <ReviewHygieneQuotationCard
          selectedClient={selectedClient}
          formData={{
            ...baseFormData,
            pricingRuleVersion: 'ih_complexity_v1',
            complexityRating: 4,
          }}
          setFormData={vi.fn()}
          onSave={vi.fn()}
          isEditMode
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Complexity: 4 \(1\.3x\)/)).toBeInTheDocument()
    expect(screen.queryByText('Additional Fees (RM)')).not.toBeInTheDocument()
    expect(screen.queryByText('Gross Subtotal (RM)')).not.toBeInTheDocument()
    expect(screen.getByText('Subtotal (RM)')).toBeInTheDocument()
    expect(screen.getByText('RM 6,500.00')).toBeInTheDocument()
    expect(screen.getAllByText('RM 6,200.00').length).toBeGreaterThan(0)
  })
})
