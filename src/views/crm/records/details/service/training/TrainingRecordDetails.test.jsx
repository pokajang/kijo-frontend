import React from 'react'
import { CCard } from '@coreui/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import TrainingRecordDetails from './TrainingRecordDetails'

const baseRecord = {
  id: 11,
  quotationId: 'QTR26-0011',
  inquirySource: 'Referral',
  inquirySourceRemarks: 'Introduced by an existing client.',
  proposalLanguage: 'en',
  priceExceptionRequestId: 44,
  clientDetails: {
    companyName: 'Example Industries',
    ssmNumber: '202601001234',
    address: '1 Industrial Park',
    city: 'Shah Alam',
    state: 'Selangor',
    zip: '40150',
    fullName: 'Aisyah Rahman',
    email: 'aisyah@example.test',
    mobileNumber: '60123456789',
    position: 'Safety Manager',
  },
  formData: {
    trainingTitle: 'Working at Height',
    trainingTypeOption: 'Physical',
    paymentMethod: 'HRD Grant',
    selectedDate: '2026-08-01',
    selectedEndDate: '2026-08-02',
    toBeConfirmed: false,
    trainingVenue: 'Client training room',
    targetGroups: 'Site supervisors',
    trainingInqRemarks: 'Bring safety equipment.',
    pricingBasis: 'per_session',
    trainingRateType: 'client_site_normal',
    sessionCount: 2,
    trainingDuration: 2,
    durationUnit: 'day(s)',
    noOfPax: 25,
    unitPrice: 4500,
    travelRegion: 'northern',
    travelCharge: 500,
    mealsProvided: 1,
    mealPrice: 30,
    discountType: 'Introductory',
    discountValue: 300,
    sstRate: 8,
    hrdCharge: 1,
    estimatedTotalCost: 15000,
    trafficLightRuleVersion: 'v1',
  },
  trainingTotal: 18000,
  mealTotal: 3000,
  mobilizationCost: 500,
  discountAmount: 300,
  subtotal: 21200,
  sstAmount: 1696,
  hrdAmount: 177,
  grandTotal: 23073,
  estimatedCost: 15000,
}

const renderDetails = (record = baseRecord) =>
  render(
    <CCard>
      <TrainingRecordDetails record={record} getDateOnly={(value) => value || ''} />
    </CCard>,
  )

const expectDocumentOrder = (elements) => {
  elements.slice(0, -1).forEach((element, index) => {
    expect(
      element.compareDocumentPosition(elements[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
}

const getSectionBody = (name) =>
  screen.getByRole('heading', { name }).parentElement?.nextElementSibling

afterEach(cleanup)

describe('TrainingRecordDetails', () => {
  it('surfaces client, inquiry, training, pricing, and governance data', () => {
    renderDetails()

    expect(screen.getByText('Example Industries')).toBeInTheDocument()
    expect(screen.getByText('202601001234')).toBeInTheDocument()
    expect(screen.getByText('Introduced by an existing client.')).toBeInTheDocument()
    expect(screen.getByText('Bring safety equipment.')).toBeInTheDocument()
    expect(screen.getByText('2026-08-01 to 2026-08-02')).toBeInTheDocument()
    expect(screen.getByText('Client Site - Normal Training')).toBeInTheDocument()
    expect(screen.getByText('Northern - Perlis, Kedah, Penang & Perak')).toBeInTheDocument()
    expect(screen.getByText('Green — Can issue')).toBeInTheDocument()
    expect(screen.getByText('#44')).toBeInTheDocument()
  })

  it('follows the quotation form sequence and field order', () => {
    renderDetails()

    expectDocumentOrder([
      screen.getByRole('heading', { name: 'Client & Contact' }),
      screen.getByRole('heading', { name: 'Quotation Context' }),
      screen.getByRole('heading', { name: 'Training Details' }),
      screen.getByRole('heading', { name: 'Pricing Governance' }),
      screen.getByRole('heading', { name: 'Pricing Configuration' }),
      screen.getByRole('heading', { name: 'Quotation Calculation' }),
    ])

    const quotationContext = getSectionBody('Quotation Context')
    expectDocumentOrder([
      within(quotationContext).getByText('Proposal Language'),
      within(quotationContext).getByText('Inquiry Source'),
      within(quotationContext).getByText('Source Remarks'),
    ])
    expect(within(getSectionBody('Training Details')).queryByText('Proposal Language')).toBeNull()

    const pricingConfiguration = getSectionBody('Pricing Configuration')
    expectDocumentOrder(
      [
        'Pricing Category',
        'Travel Region',
        'Pricing Basis',
        'Quantity',
        'Duration',
        'Participants',
        'Unit Price',
        'Mobilization & Accommodation',
        'Participant Meals',
        'Meal Rate',
        'Discount',
        'SST Rate',
        'HRD Rate',
      ].map((label) => within(pricingConfiguration).getByText(label)),
    )
  })

  it('renders persisted totals as one ordered calculation table', () => {
    renderDetails()

    const table = screen.getByRole('table')
    expect(
      within(table).getByText('Training quotation calculation from training cost to grand total'),
    ).toBeInTheDocument()
    const trainingRow = within(table).getByRole('row', { name: /^training cost/i })
    const mobilizationRow = within(table).getByRole('row', { name: /mobilization costs/i })
    const mealsRow = within(table).getByRole('row', { name: /^meals/i })
    const discountRow = within(table).getByRole('row', { name: /discount — introductory/i })
    const grandTotalRow = within(table).getByRole('row', { name: /grand total/i })

    expectDocumentOrder([trainingRow, mobilizationRow, mealsRow, discountRow, grandTotalRow])
    expect(
      within(trainingRow).getByText('2 session(s) × 2 day(s) × RM 4,500.00'),
    ).toBeInTheDocument()
    expect(within(trainingRow).getByText('RM 18,000.00')).toBeInTheDocument()
    expect(within(discountRow).getByText('− RM 300.00')).toBeInTheDocument()
    expect(within(grandTotalRow).getByText('RM 23,073.00')).toBeInTheDocument()
  })

  it('represents per-pax, TBC, no-meal, and no-discount choices explicitly', () => {
    renderDetails({
      ...baseRecord,
      priceExceptionRequestId: null,
      formData: {
        ...baseRecord.formData,
        toBeConfirmed: true,
        selectedDate: null,
        selectedEndDate: null,
        pricingBasis: 'per_pax',
        trainingRateType: 'safex_individual_aesp',
        sessionCount: 0,
        trainingDuration: 0,
        noOfPax: 10,
        unitPrice: 870,
        mealsProvided: 0,
        mealPrice: 0,
        discountType: 'No Discount',
        discountValue: 0,
      },
      trainingTotal: 8700,
      mealTotal: 0,
      mobilizationCost: 0,
      discountAmount: 0,
      subtotal: 8700,
      sstAmount: 0,
      hrdAmount: 0,
      grandTotal: 8700,
    })

    expect(screen.getByText('To be confirmed')).toBeInTheDocument()
    expect(screen.getByText('Per Pax')).toBeInTheDocument()
    expect(screen.getAllByText('Not applicable').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No discount').length).toBeGreaterThan(0)

    const table = screen.getByRole('table')
    expect(within(table).getByText('10 pax × RM 870.00 per pax')).toBeInTheDocument()
  })
})
