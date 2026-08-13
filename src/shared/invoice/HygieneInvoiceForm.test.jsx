import React, { useState } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import HygieneInvoiceForm from './HygieneInvoiceForm'

const Harness = ({ quoteDetails }) => {
  const [pricing, setPricing] = useState({})

  return (
    <>
      <HygieneInvoiceForm quoteDetails={quoteDetails} pricing={pricing} setPricing={setPricing} />
      <pre data-testid="pricing-state">{JSON.stringify(pricing)}</pre>
    </>
  )
}

describe('HygieneInvoiceForm historical pricing', () => {
  afterEach(cleanup)

  it('preserves an unchanged intermediate quote snapshot and excludes fee rows', async () => {
    render(
      <Harness
        quoteDetails={{
          id: 68,
          service_title: 'Intermediate Monitoring',
          service_code: 'IH',
          site_address: 'Test Site',
          sample_counts: 120,
          sample_unit: 'sample(s)',
          num_work_units: 1,
          unit_price: 79.17,
          travel_charge: 0,
          discount: 200,
          sst_percent: 0,
          sst_amount: 0,
          sub_total: 9300,
          grand_total: 9300,
          pricing_rule_version: 'ih_standard_v1',
          complexity_rating: 4,
          hygiene_items: [
            {
              id: 1,
              item_description: 'Must be ignored',
              quantity: 1,
              unit_price: 500,
            },
          ],
        }}
      />,
    )

    await waitFor(() => {
      const pricing = JSON.parse(screen.getByTestId('pricing-state').textContent)
      expect(pricing.pricing_rule_version).toBe('ih_standard_v1')
      expect(pricing.sub_total).toBe(9500)
      expect(pricing.grand_total).toBe(9300)
      expect(pricing.hygiene_items).toEqual([])
    })

    expect(screen.getByRole('button', { name: 'Add New Item' })).toBeInTheDocument()
    expect(screen.getAllByText('9500.00')).toHaveLength(2)
  })

  it('does not add the discount back to a legacy gross subtotal', async () => {
    render(
      <Harness
        quoteDetails={{
          id: 31,
          service_title: 'LEV Inspection',
          service_code: 'LEV',
          site_address: 'Test Site',
          sample_counts: 2,
          sample_unit: 'sample(s)',
          num_work_units: 1,
          unit_price: 1500,
          travel_charge: 0,
          discount: 50,
          sst_percent: 0,
          sst_amount: 0,
          sub_total: 3000,
          grand_total: 2950,
          pricing_rule_version: 'ih_complexity_v1',
          complexity_rating: 1,
          hygiene_items: [],
        }}
      />,
    )

    await waitFor(() => {
      const pricing = JSON.parse(screen.getByTestId('pricing-state').textContent)
      expect(pricing.sub_total).toBe(3000)
      expect(pricing.discount).toBe(50)
      expect(pricing.grand_total).toBe(2950)
    })

    expect(screen.getAllByText('3000.00').length).toBeGreaterThan(0)
    expect(screen.queryByText('3050.00')).not.toBeInTheDocument()
  })

  it('shows a field error directly on the invalid discount input', () => {
    render(
      <HygieneInvoiceForm
        quoteDetails={null}
        pricing={{
          pricing_rule_version: 'ih_standard_v2',
          sample_counts: 1,
          sample_unit: 'sample(s)',
          num_work_units: 1,
          unit_price: 100,
          travel_qty: 1,
          travel_unit_price: 0,
          discount_qty: 1,
          discount_unit_price: 120,
          sst_percent: 0,
          hygiene_items: [],
        }}
        setPricing={() => {}}
        fieldErrors={{
          'pricing.discount_unit_price': [
            'Discount cannot exceed the gross subtotal of RM 100.00.',
          ],
        }}
      />,
    )

    const input = document.querySelector('[data-field-path="pricing.discount_unit_price"]')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText('Discount cannot exceed the gross subtotal of RM 100.00.'),
    ).toBeInTheDocument()
  })
})
