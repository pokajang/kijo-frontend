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

  it('builds a manual Special payload without quote details', () => {
    const result = buildInvoiceCreatePayload('Special', {
      ...baseArgs,
      project: {
        id: 22,
        project_name: 'Special Project',
        project_type: 'Special',
      },
      quoteDetails: null,
      pricing: {
        ...baseArgs.pricing,
        service_title: 'Special Project',
        sub_total: 5000,
        grand_total: 5000,
        sst_amount: 0,
        discount: 0,
        special_items: [
          {
            item_description: 'Special service',
            description: 'Manual scope',
            quantity: 1,
            unit: 'Lot',
            unit_price: 5000,
          },
        ],
      },
      projectMeta: { project_name: 'Special Project' },
      allowWithoutQuote: true,
    })

    expect(result.success).toBe(true)
    expect(result.payload).toEqual(
      expect.objectContaining({
        project_id: 22,
        service_type: 'Special',
        quote_id: null,
        invoice_purpose: 'Special Project',
        amount: 5000,
        grand_total: 5000,
      }),
    )
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: 'Special service',
          description: 'Manual scope',
          quantity: 1,
          unit: 'Lot',
          unit_price: 5000,
        }),
      ]),
    )
  })

  it('builds a manual Special Service payload without quote details', () => {
    const result = buildInvoiceCreatePayload('Special Service', {
      ...baseArgs,
      project: {
        id: 23,
        project_name: 'Special Service Project',
        project_type: 'Special Service',
      },
      quoteDetails: null,
      pricing: {
        ...baseArgs.pricing,
        service_title: 'Special Service Project',
        sub_total: 3000,
        grand_total: 3000,
        sst_amount: 0,
        discount: 0,
        special_items: [
          {
            item_description: 'Special service',
            description: 'Manual service scope',
            quantity: 1,
            unit: 'Lot',
            unit_price: 3000,
          },
        ],
      },
      projectMeta: { project_name: 'Special Service Project' },
      allowWithoutQuote: true,
    })

    expect(result.success).toBe(true)
    expect(result.payload).toEqual(
      expect.objectContaining({
        project_id: 23,
        service_type: 'Special Service',
        quote_id: null,
        invoice_purpose: 'Special Service Project',
        amount: 3000,
        grand_total: 3000,
      }),
    )
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: 'Special service',
          description: 'Manual service scope',
          quantity: 1,
          unit: 'Lot',
          unit_price: 3000,
        }),
      ]),
    )
  })

  it('builds a training HRD payload with hrd grant approval and HRD row', () => {
    const result = buildInvoiceCreatePayload('Training', {
      ...baseArgs,
      project: {
        ...baseArgs.project,
        project_type: 'Training',
        quote_id: 77,
        project_name: 'Safety Program',
      },
      quoteDetails: {
        id: 77,
        payment_method: 'hrd grant',
      },
      pricing: {
        ...baseArgs.pricing,
        subtotal: 110,
        grand_total: 120,
        hrd_rate: 10,
        hrd_amount: 10,
        sst_amount: 0,
        training_total: 100,
        training_qty: 1,
        meal_total: 10,
        meal_qty: 1,
        mobilization_cost: 0,
        mobilization_qty: 1,
        discount_amount: 0,
        training_items: [
          {
            item_description: 'Bootcamp kit',
            description: 'Manual material',
            quantity: 2,
            unit: 'Lot',
            unit_price: 5,
          },
        ],
      },
      paymentMethodOverride: 'hrd grant',
      grantApprovalNo: 'HRD-007',
    })

    expect(result.success).toBe(true)
    expect(result.payload.payment_method).toBe('hrd grant')
    expect(result.payload.grant_approval_no).toBe('HRD-007')
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: '10% HRD Charge',
          quantity: 1,
          unit_price: 10,
        }),
        expect.objectContaining({
          item_description: 'Bootcamp kit',
          quantity: 2,
          unit_price: 5,
        }),
      ]),
    )
    expect(result.payload.amount).toBe(110)
    expect(result.payload.grand_total).toBe(120)
  })

  it('does not include HRD row when training is created as direct payment', () => {
    const result = buildInvoiceCreatePayload('Training', {
      ...baseArgs,
      project: {
        ...baseArgs.project,
        project_type: 'Training',
        quote_id: 77,
      },
      quoteDetails: {
        id: 77,
        payment_method: 'direct payment',
      },
      pricing: {
        ...baseArgs.pricing,
        subtotal: 120,
        grand_total: 120,
        hrd_rate: 10,
        hrd_amount: 10,
        sst_amount: 0,
        training_total: 100,
        training_qty: 1,
        meal_total: 10,
        meal_qty: 1,
        mobilization_cost: 10,
        mobilization_qty: 1,
        discount_amount: 0,
        training_items: [
          {
            item_description: 'Bootcamp kit',
            description: 'Manual material',
            quantity: 2,
            unit: 'Lot',
            unit_price: 5,
          },
        ],
      },
      paymentMethodOverride: 'Direct Payment',
      grantApprovalNo: 'IGNORED',
    })

    expect(result.success).toBe(true)
    expect(result.payload.payment_method).toBe('Direct Payment')
    expect(result.payload.grant_approval_no).toBe(null)
    expect(result.payload.breakdown.map((item) => item.item_description)).not.toContain(
      '10% HRD Charge',
    )
    expect(result.payload.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_description: 'Bootcamp kit',
          quantity: 2,
          unit_price: 5,
        }),
      ]),
    )
  })

  it('requires HRD grant approval number for HRD training payloads', () => {
    const result = buildInvoiceCreatePayload('Training', {
      ...baseArgs,
      project: {
        ...baseArgs.project,
        project_type: 'Training',
        quote_id: 77,
      },
      quoteDetails: {
        id: 77,
        payment_method: 'hrd grant',
      },
      pricing: {
        ...baseArgs.pricing,
        subtotal: 100,
        grand_total: 100,
        hrd_rate: 5,
        hrd_amount: 5,
        sst_amount: 0,
        training_total: 100,
      },
      paymentMethodOverride: 'hrd grant',
      grantApprovalNo: '',
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('HRD Grant Approval No.'),
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
