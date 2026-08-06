import React from 'react'
import { CCard } from '@coreui/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import RecordServiceDetails from './RecordServiceDetails'
import { buildHygieneCalculationRows } from './hygiene/hygieneRecordDetailUtils'

const commonRecord = {
  quotationId: 'Q26-0001',
  inquirySource: 'Physical Meeting',
  inquirySourceRemarks: 'Discussed at the client office.',
  proposalLanguage: 'en',
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
}

const renderService = (serviceTab, record) =>
  render(
    <CCard>
      <RecordServiceDetails serviceTab={serviceTab} record={{ ...commonRecord, ...record }} />
    </CCard>,
  )

const getRow = (name) => within(screen.getByRole('table')).getByRole('row', { name })

afterEach(cleanup)

describe('RecordServiceDetails', () => {
  it('preserves the net-subtotal convention used by historical Hygiene quotes', () => {
    const rows = buildHygieneCalculationRows({
      subtotal: 12900,
      discountAmount: 300,
      formData: {
        pricingRuleVersion: 'ih_complexity_v1',
        travelCharge: 200,
        discount: 300,
      },
    })
    const amountFor = (key) => rows.find((row) => row.key === key)?.amount

    expect(amountFor('service-cost')).toBe(13000)
    expect(amountFor('gross-subtotal')).toBe(13200)
    expect(amountFor('subtotal')).toBe(12900)
  })

  it('renders complete Industrial Hygiene details and an ordered calculation', () => {
    renderService('ih-tab', {
      estimatedCost: 1000,
      discountAmount: 100,
      subtotal: 1550,
      sstAmount: 116,
      grandTotal: 1566,
      formData: {
        serviceTitle: 'Chemical Exposure Monitoring',
        serviceCode: 'CEM',
        siteAddress: 'Factory 2, Shah Alam',
        sampleCounts: 2,
        sampleUnit: 'sample(s)',
        numWorkUnits: 1,
        inquiryRemarks: 'Night-shift sampling required.',
        unitPrice: 500,
        travelCharge: 250,
        discount: 100,
        sstPercent: 8,
        pricingRuleVersion: 'ih_standard_v2',
        complexityRating: 1,
        estimatedTotalCost: 1000,
        trafficLightRuleVersion: 'v1',
      },
      lineItems: [
        {
          id: 4,
          itemName: 'Laboratory analysis',
          item_description: 'Laboratory analysis',
          description: 'Two samples',
          quantity: 2,
          unit: 'sample',
          unitPrice: 150,
          lineTotal: 300,
        },
      ],
    })

    expect(screen.getByRole('heading', { name: 'Industrial Hygiene Details' })).toBeInTheDocument()
    expect(screen.getByText('Night-shift sampling required.')).toBeInTheDocument()
    expect(screen.getByText('Standard Pricing (V2)')).toBeInTheDocument()
    expect(getRow(/service cost/i)).toHaveTextContent('RM 1,000.00')
    expect(getRow(/laboratory analysis/i)).toHaveTextContent('RM 300.00')
    expect(getRow(/gross subtotal/i)).toHaveTextContent('RM 1,550.00')
    expect(getRow(/subtotal after discount/i)).toHaveTextContent('RM 1,450.00')
    expect(getRow(/grand total/i)).toHaveTextContent('RM 1,566.00')
  })

  it('renders monthly Manpower inputs and the saved summation flow', () => {
    renderService('manpower-tab', {
      estimatedCost: 15000,
      discountAmount: 500,
      subtotal: 23500,
      sstAmount: 1880,
      grandTotal: 25380,
      formData: {
        serviceTitle: 'Safety and Health Officer',
        serviceCode: 'SHO',
        manpowerRateType: 'sho',
        billingUnit: 'month',
        natureOfWork: 'Construction safety supervision',
        siteLocation: 'Klang',
        durationMonths: 2,
        durationHours: 0,
        noOfPax: 2,
        inquiryRemarks: 'Weekend coverage included.',
        requiresManagementApproval: false,
        estimatedTotalCost: 15000,
        trafficLightRuleVersion: 'v1',
        unitCost: 6000,
        discount: 500,
        sstPercent: 8,
      },
    })

    expect(screen.getByRole('heading', { name: 'Manpower Details' })).toBeInTheDocument()
    expect(screen.getByText('Construction safety supervision')).toBeInTheDocument()
    expect(screen.getByText('2 month(s)')).toBeInTheDocument()
    expect(getRow(/manpower cost/i)).toHaveTextContent('RM 24,000.00')
    expect(getRow(/discount/i)).toHaveTextContent('RM 500.00')
    expect(getRow(/grand total/i)).toHaveTextContent('RM 25,380.00')
  })

  it('renders Special Service remarks, decimal quantities, discount, and totals', () => {
    renderService('special-tab', {
      subtotal: 500,
      sstAmount: 40,
      sstPercent: 8,
      discountAmount: 50,
      grandTotal: 540,
      formData: {
        serviceTitle: 'Site Audit',
        serviceCode: 'SA',
        generalRemarks: 'Include a management presentation.',
        discount: 50,
        sstPercent: 8,
      },
      lineItems: [
        {
          id: 2,
          title: 'Audit day',
          description: 'On-site assessment',
          unit: 'Day',
          quantity: 1.5,
          unitPrice: 300,
          lineTotal: 450,
        },
        {
          id: 3,
          title: 'Report',
          unit: 'Per Item',
          quantity: 1,
          unitPrice: 100,
          lineTotal: 100,
        },
      ],
    })

    expect(screen.getByRole('heading', { name: 'Special Service Details' })).toBeInTheDocument()
    expect(screen.getByText('Include a management presentation.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pricing Governance' })).not.toBeInTheDocument()
    expect(getRow(/audit day/i)).toHaveTextContent('1.5 Day')
    expect(getRow(/^discount deduction/i)).toHaveTextContent('RM 50.00')
    expect(getRow(/line items subtotal/i)).toHaveTextContent('RM 550.00')
    expect(getRow(/subtotal after discount/i)).toHaveTextContent('RM 500.00')
    expect(getRow(/grand total/i)).toHaveTextContent('RM 540.00')
  })

  it('distinguishes Equipment base cost, quoted price, charges, and totals', () => {
    renderService('equipment-tab', {
      estimatedCost: 1000,
      deliveryCharge: 100,
      miscCharge: 25,
      discount: 50,
      subtotal: 1275,
      sstPercent: 8,
      sstAmount: 102,
      grandTotal: 1377,
      formData: {
        estimatedTotalCost: 1000,
        trafficLightRuleVersion: 'v1',
        quotationRemarks: 'Deliver all equipment together.',
      },
      lineItems: [
        {
          id: 8,
          itemName: 'Gas Detector',
          categoryId: 'MONITORING',
          description: 'Portable detector',
          itemRemarks: 'Colour: navy blue',
          unit: 'unit',
          supplierName: 'Supplier A',
          supplierPrice: 400,
          priceDate: '2026-07-01',
          quantity: 2,
          unitPrice: 400,
          markedUp: 600,
          lineTotal: 1200,
        },
      ],
    })

    expect(screen.getByRole('heading', { name: 'Equipment Items' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quotation Remarks' })).toBeInTheDocument()
    expect(screen.getByText('Deliver all equipment together.')).toBeInTheDocument()
    expect(screen.getByText(/Client specifications:/).parentElement).toHaveTextContent(
      'Colour: navy blue',
    )
    expect(screen.getByText(/Saved base cost: RM 400.00/)).toBeInTheDocument()
    expect(screen.getByText(/Saved quoted unit price: RM 600.00/)).toBeInTheDocument()
    expect(screen.getByText(/Current catalog reference: Supplier A/)).toBeInTheDocument()
    expect(getRow(/gas detector/i)).toHaveTextContent('RM 1,200.00')
    expect(getRow(/delivery charge/i)).toHaveTextContent('RM 100.00')
    expect(getRow(/grand total/i)).toHaveTextContent('RM 1,377.00')
  })

  it('returns no service details for an unknown tab', () => {
    const { container } = renderService('unknown-tab', {})
    expect(container.querySelector('.card')?.textContent).toBe('')
  })
})
