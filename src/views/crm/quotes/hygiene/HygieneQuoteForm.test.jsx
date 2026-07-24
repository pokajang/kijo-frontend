import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import HygieneQuoteForm from './HygieneQuoteForm'

const mocks = vi.hoisted(() => ({
  saveQuote: vi.fn(),
  routeParams: {
    isRevision: false,
    priceExceptionRequestId: null,
  },
  alert: vi.fn(),
}))

vi.mock('../helpers/useQuoteSave', () => ({
  useQuoteSave: () => mocks.saveQuote,
}))

vi.mock('../helpers/quoteRouteParams', () => ({
  useQuoteRouteParams: () => mocks.routeParams,
}))

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: mocks.alert,
  },
}))

vi.mock('./HygieneDetailsCard', () => ({
  default: ({ formData, setFormData }) => (
    <section>
      <div data-testid="details-rule">{formData.pricingRuleVersion}</div>
      <button
        type="button"
        onClick={() =>
          setFormData((current) => ({
            ...current,
            serviceId: 201,
            serviceTitle: 'CEM Monitoring',
            serviceCode: 'CEM',
            sampleCounts: 2,
            numWorkUnits: 1,
            unitPrice: 500,
            discount: 0,
          }))
        }
      >
        Select IH service
      </button>
    </section>
  ),
}))

vi.mock('../shared/TrafficLightCard', () => ({
  default: ({ estimatedTotalCost, onEstimatedTotalCostChange }) => (
    <section data-testid="traffic-light">
      <div data-testid="estimated-cost">{String(estimatedTotalCost)}</div>
      <button type="button" onClick={() => onEstimatedTotalCostChange(1500)}>
        Set estimated cost
      </button>
    </section>
  ),
}))

vi.mock('./PricingCard', () => ({
  default: ({ formData }) => (
    <div data-testid="pricing">
      {formData.pricingRuleVersion}:{formData.complexityRating}
    </div>
  ),
}))

vi.mock('./ReviewHygieneQuotationCard', () => ({
  default: ({ formData, onSave }) => (
    <section data-testid="review">
      <div data-testid="review-total">{formData.grandTotal}</div>
      <button type="button" onClick={onSave}>
        Save quote
      </button>
    </section>
  ),
}))

const selectedClient = {
  company_id: 7,
  company_name: 'Flow Test Sdn Bhd',
  ssm_number: '202601234567',
  address: '1 Test Road',
  city: 'Kuala Lumpur',
  state: 'Wilayah Persekutuan',
  zip: '50000',
  selected_pic: {
    full_name: 'Test PIC',
    email: 'pic@example.test',
    mobile_number: '0123456789',
    position: 'Manager',
  },
}

describe('HygieneQuoteForm pricing-version flows', () => {
  beforeEach(() => {
    mocks.routeParams.isRevision = false
    mocks.routeParams.priceExceptionRequestId = null
    mocks.saveQuote.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('keeps a new quote on V2 and requires an estimated cost before pricing and review', async () => {
    render(<HygieneQuoteForm selectedClient={selectedClient} />)

    expect(screen.getByTestId('details-rule')).toHaveTextContent('ih_standard_v2')
    expect(screen.queryByTestId('traffic-light')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select IH service' }))

    expect(await screen.findByTestId('traffic-light')).toBeInTheDocument()
    expect(screen.queryByTestId('pricing')).not.toBeInTheDocument()
    expect(screen.queryByTestId('review')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Set estimated cost' }))

    expect(await screen.findByTestId('pricing')).toHaveTextContent('ih_standard_v2:1')
    expect(screen.getByTestId('review')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }))

    await waitFor(() => expect(mocks.saveQuote).toHaveBeenCalledOnce())
    expect(mocks.saveQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        estimated_total_cost: 1500,
        complexity_rating: 1,
        sub_total: 1000,
        grand_total: 1000,
      }),
    )
    expect(mocks.saveQuote.mock.calls[0][0]).not.toHaveProperty('pricing_rule_version')
  })

  it('allows a legacy V1 quote with no estimate to continue with its stored complexity', async () => {
    mocks.routeParams.isRevision = true

    render(
      <HygieneQuoteForm
        selectedClient={selectedClient}
        isEditMode
        quoteId={91}
        initialFormData={{
          serviceId: 201,
          serviceTitle: 'CEM Monitoring',
          serviceCode: 'CEM',
          siteAddress: 'Legacy Site',
          sampleCounts: 2,
          sampleUnit: 'sample(s)',
          numWorkUnits: 1,
          unitPrice: 500,
          travelCharge: 0,
          discount: 0,
          sstPercent: 0,
          estimatedTotalCost: '',
          pricingRuleVersion: 'ih_complexity_v1',
          complexityRating: 4,
          hygieneItems: [],
        }}
      />,
    )

    expect(await screen.findByTestId('pricing')).toHaveTextContent('ih_complexity_v1:4')
    expect(screen.getByTestId('estimated-cost')).toHaveTextContent('')
    expect(screen.getByTestId('review')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }))

    await waitFor(() => expect(mocks.saveQuote).toHaveBeenCalledOnce())
    expect(mocks.alert).not.toHaveBeenCalled()
    expect(mocks.saveQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 91,
        isRevision: true,
        estimated_total_cost: null,
        complexity_rating: 4,
        sub_total: 1300,
        grand_total: 1300,
      }),
    )
  })

  it('updates a V2 quote with its estimate and miscellaneous fees intact', async () => {
    render(
      <HygieneQuoteForm
        selectedClient={selectedClient}
        isEditMode
        quoteId={92}
        initialFormData={{
          serviceId: 201,
          serviceTitle: 'CEM Monitoring',
          serviceCode: 'CEM',
          siteAddress: 'Current Site',
          sampleCounts: 2,
          sampleUnit: 'sample(s)',
          numWorkUnits: 1,
          unitPrice: 500,
          travelCharge: 0,
          discount: 0,
          sstPercent: 0,
          estimatedTotalCost: 800,
          pricingRuleVersion: 'ih_standard_v2',
          complexityRating: 1,
          hygieneItems: [
            {
              id: 5,
              item_description: 'Laboratory fee',
              description: 'Analysis',
              quantity: 1,
              unit: 'Lot',
              unit_price: 200,
            },
          ],
        }}
      />,
    )

    expect(await screen.findByTestId('pricing')).toHaveTextContent('ih_standard_v2:1')
    expect(screen.getByTestId('estimated-cost')).toHaveTextContent('800')

    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }))

    await waitFor(() => expect(mocks.saveQuote).toHaveBeenCalledOnce())
    expect(mocks.saveQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 92,
        isRevision: false,
        estimated_total_cost: 800,
        sub_total: 1200,
        grand_total: 1200,
        hygiene_items: [
          expect.objectContaining({
            id: 5,
            item_description: 'Laboratory fee',
            line_total: 200,
          }),
        ],
      }),
    )
  })
})
