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

  it('uses equipment marked-up price, not supplier unit price, in invoice breakdown', () => {
    const result = buildInvoiceCreatePayload('Equipment Supply', {
      ...baseArgs,
      project: {
        id: 12,
        quote_id: 44,
        project_name: 'Equipment Project',
        project_type: 'Equipment Supply',
      },
      quoteDetails: {
        id: 44,
        equipment_items: [
          {
            item_name: 'Gas detector',
            description: 'Portable detector',
            unit: 'unit',
            quantity: 2,
            unit_price: 100,
            marked_up_price: 150,
          },
        ],
      },
      pricing: {
        ...baseArgs.pricing,
        sub_total: 300,
        grand_total: 300,
        sst_amount: 0,
        equipment_items: [],
        discount: 0,
        delivery_charge: 0,
        misc_charge: 0,
      },
    })

    expect(result.success).toBe(true)
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: 'Gas detector',
          quantity: 2,
          unit_price: 150,
        }),
      ]),
    )
  })

  it('includes Industrial Hygiene additional fees in invoice breakdown', () => {
    const result = buildInvoiceCreatePayload('Industrial Hygiene', {
      ...baseArgs,
      project: {
        id: 18,
        quote_id: 55,
        project_name: 'IH Project',
        project_type: 'Industrial Hygiene',
      },
      quoteDetails: {
        id: 55,
        service_title: 'CEM Monitoring',
        sample_unit: 'sample(s)',
        hygiene_items: [
          {
            item_description: 'Sample analysis',
            description: 'Lab analysis',
            quantity: 2,
            unit: 'sample',
            unit_price: 120,
          },
        ],
      },
      pricing: {
        ...baseArgs.pricing,
        service_title: 'CEM Monitoring at Site A',
        sub_total: 1240,
        grand_total: 1240,
        sst_amount: 0,
        sample_counts: 2,
        sample_unit: 'sample(s)',
        num_work_units: 1,
        unit_price: 500,
        travel_charge: 0,
        discount: 0,
        hygiene_items: [],
      },
    })

    expect(result.success).toBe(true)
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: 'Sample analysis',
          description: 'Lab analysis',
          quantity: 2,
          unit: 'sample',
          unit_price: 120,
        }),
      ]),
    )
  })
})
