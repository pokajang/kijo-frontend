import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import ReviewSpecialQuoteCard from './ReviewSpecialQuoteCard'

const selectedClient = {
  company_id: 1,
  company_name: 'Test Client',
  address: 'Main Road',
  city: 'Kajang',
  state: 'Selangor',
}

const baseFormData = {
  serviceTitle: 'Smoke Special Service',
  serviceCode: 'SS',
  generalRemarks: 'General note',
  discount: 25,
  sstPercent: 0,
  subTotal: 75,
  sstAmount: 0,
  attachProposal: true,
  lineItems: [
    {
      title: 'Custom service',
      description: '',
      unit: '',
      quantity: 1,
      unitPrice: 100,
      amount: 100,
    },
  ],
}

afterEach(() => {
  cleanup()
})

describe('ReviewSpecialQuoteCard', () => {
  it('shows optional line item fields and the discount math in the review table', () => {
    render(
      <MemoryRouter>
        <ReviewSpecialQuoteCard
          selectedClient={selectedClient}
          formData={baseFormData}
          setFormData={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Custom service')).toBeInTheDocument()
    expect(screen.getByText('Line Items Subtotal (RM)')).toBeInTheDocument()
    expect(screen.getAllByText('RM 100.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Discount (RM)')).toBeInTheDocument()
    expect(screen.getByText('- RM 25.00')).toBeInTheDocument()
    expect(screen.getAllByText('RM 75.00').length).toBeGreaterThan(0)
  })
})
