import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildInvoiceCreatePayload } from './invoiceCreatePayload'

const baseArgs = {
  project: {
    id: 9,
    project_name: 'Manpower Project',
    project_type: 'Manpower Supply',
  },
  quoteDetails: null,
  pricing: {
    service_title: 'Manpower Deployment',
    sub_total: 100,
    grand_total: 100,
    sst_amount: 0,
    quantity: 2,
    duration: 1,
    unit_cost: 50,
    unit: 'pax-mth',
    claim_type: 'single',
    discount: 0,
    manpower_items: [],
  },
  projectMeta: { project_name: 'Manpower Project' },
  clientOverrides: {
    clientName: 'Client A',
    clientSSM: '',
    clientTIN: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    clientZip: '',
    picName: 'PIC A',
    picPhone: '',
    picEmail: '',
    picPosition: '',
    overridePaymentTerms: false,
    paymentTermsDays: 30,
  },
  grantApprovalNo: '',
  paymentMethodOverride: 'Direct Payment',
  allowWithoutQuote: true,
  loaNo: '',
  paymentTermsDays: 30,
  overridePaymentTerms: false,
}

describe('buildInvoiceCreatePayload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds the expected manual Manpower payload', () => {
    const result = buildInvoiceCreatePayload('Manpower Supply', baseArgs)

    expect(result.success).toBe(true)
    expect(result.payload).toEqual(
      expect.objectContaining({
        project_id: 9,
        service_type: 'Manpower Supply',
        quote_id: null,
        invoice_purpose: 'Manpower Deployment',
        payment_method: 'Direct Payment',
        amount: 100,
        sst_amount: 0,
        grand_total: 100,
        invoice_client_name: 'Client A',
        invoice_pic_name: 'PIC A',
      }),
    )
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: 'Manpower Deployment',
          unit: 'pax-mth',
          quantity: 2,
          unit_price: 50,
          description: '2 pax x 1 month',
        }),
      ]),
    )
  })

  it('does not call fetch while building a review payload', () => {
    global.fetch = vi.fn()

    const result = buildInvoiceCreatePayload('Manpower Supply', baseArgs)

    expect(result.success).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rejects manual Manpower creation without a valid amount', () => {
    const result = buildInvoiceCreatePayload('Manpower Supply', {
      ...baseArgs,
      pricing: {
        ...baseArgs.pricing,
        sub_total: 0,
        grand_total: 0,
      },
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('valid invoice amount'),
      }),
    )
  })
})
