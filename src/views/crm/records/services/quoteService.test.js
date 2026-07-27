import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchIHQuotes, fetchTrainingQuotes } from './quoteService'

describe('quoteService training records', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preserves training form fields and persisted calculation totals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: [
              {
                id: 11,
                quote_ref_no: 'QTR26-0011',
                training_title: 'Working at Height',
                training_type: 'Physical',
                payment_method: 'HRD Grant',
                proposed_date: '2026-08-01',
                proposed_end_date: '2026-08-02',
                venue: 'Client training room',
                remarks: 'Bring safety equipment.',
                target_groups: 'Site supervisors',
                pax: '25',
                session_count: '2',
                duration_per_session: '1.5',
                duration_unit: 'day(s)',
                pricing_basis: 'per_session',
                training_rate_type: 'client_site_normal',
                unit_price: '4500',
                travel_charge: '500',
                travel_region: 'central',
                meals_provided: '1',
                meal_price: '30',
                discount_type: 'Introductory',
                discount_value: '300',
                sst_rate: '8',
                hrd_charge: '1',
                training_total: '18000',
                meal_total: '3000',
                mobilization_cost: '500',
                discount_amount: '300',
                subtotal: '21200',
                sst_amount: '1696',
                hrd_amount: '177',
                grand_total: '23073',
                estimated_total_cost: '15000',
                traffic_light_rule_version: 'v1',
              },
            ],
          }),
      }),
    )

    const rows = await fetchTrainingQuotes()

    expect(rows).toHaveLength(1)
    expect(rows[0].formData).toMatchObject({
      trainingTitle: 'Working at Height',
      trainingTypeOption: 'Physical',
      paymentMethod: 'HRD Grant',
      pricingBasis: 'per_session',
      trainingRateType: 'client_site_normal',
      travelRegion: 'central',
      trainingDuration: 1.5,
      estimatedTotalCost: 15000,
      trafficLightRuleVersion: 'v1',
    })
    expect(rows[0]).toMatchObject({
      trainingTotal: 18000,
      mealTotal: 3000,
      mobilizationCost: 500,
      discountAmount: 300,
      subtotal: 21200,
      sstAmount: 1696,
      hrdAmount: 177,
      grandTotal: 23073,
    })
  })

  it('keeps a missing estimated cost distinct from a zero amount', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: [
              {
                id: 12,
                quote_ref_no: 'QTR26-0012',
                estimated_total_cost: null,
                grand_total: '0',
              },
            ],
          }),
      }),
    )

    const rows = await fetchTrainingQuotes()

    expect(rows[0].estimatedCost).toBeUndefined()
    expect(rows[0].formData.estimatedTotalCost).toBeUndefined()
  })
})

describe('quoteService IH records', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps Industrial Hygiene additional fee rows into record form data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: [
              {
                id: 7,
                quote_ref_no: 'QIH26-0001AZA',
                client_name: 'Client A',
                grand_total: 500,
                hygiene_items: [
                  {
                    id: 1,
                    item_description: 'Sample analysis',
                    description: 'Lab analysis',
                    quantity: '2',
                    unit: 'sample',
                    unit_price: '120',
                    line_total: '240',
                  },
                ],
              },
            ],
          }),
      }),
    )

    const rows = await fetchIHQuotes()

    expect(rows).toHaveLength(1)
    expect(rows[0].formData.hygieneItems[0]).toMatchObject({
      item_description: 'Sample analysis',
      description: 'Lab analysis',
      quantity: 2,
      unit: 'sample',
      unit_price: 120,
      line_total: 240,
    })
    expect(rows[0].lineItems[0].itemName).toBe('Sample analysis')
  })
})
