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
      expect(pricing.sub_total).toBe(9300)
      expect(pricing.grand_total).toBe(9300)
      expect(pricing.hygiene_items).toEqual([])
    })

    expect(screen.queryByRole('button', { name: 'Add New Item' })).not.toBeInTheDocument()
    expect(screen.getByText('9500.00')).toBeInTheDocument()
  })
})
