import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InvoiceCreateFlow from './InvoiceCreateFlow'
import { submitInvoicePayload } from './invoiceCreateApi'

const navigateMock = vi.hoisted(() => vi.fn())
const submitInvoicePayloadMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../../../shared/invoice/InvoiceFormShell', async () => {
  const ReactModule = await vi.importActual('react')
  const MockInvoiceFormShell = ({ pricing, setPricing }) => {
    ReactModule.useEffect(() => {
      if (Number(pricing.sub_total) === 100) return
      setPricing((prev) => ({
        ...prev,
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
      }))
    }, [pricing.sub_total, setPricing])

    return (
      <div>
        <div>Invoice form shell</div>
        <div>Pricing: {pricing.sub_total}</div>
      </div>
    )
  }

  return {
    default: MockInvoiceFormShell,
  }
})

vi.mock('../../../project/manage/commercialDocsWarning', () => ({
  confirmExistingCommercialDocs: vi.fn(() => Promise.resolve(true)),
  hasProjectCommercialDocGroups: vi.fn(() => false),
  ProjectCommercialDocsNotice: () => null,
  useProjectCommercialDocs: () => ({
    groups: [],
    loading: false,
    error: '',
    hasExistingDocs: false,
  }),
}))

vi.mock('./invoiceCreateApi', () => ({
  useTrainingQuoteData: vi.fn(),
  useEquipmentQuoteData: vi.fn(),
  useManpowerQuoteData: vi.fn(),
  useSpecialQuoteData: vi.fn(),
  useHygieneQuoteData: vi.fn(),
  useJD14ApprovalNo: vi.fn(),
  submitInvoicePayload: submitInvoicePayloadMock,
}))

const project = {
  id: 44,
  project_name: 'Project Alpha',
  project_type: 'Manpower Supply',
  client_name: 'Client A',
  client_pics: [{ full_name: 'PIC A' }],
}

const renderFlow = (props = {}) => {
  localStorage.setItem(
    'invoiceDraft:44',
    JSON.stringify({
      version: 1,
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
    }),
  )

  return render(
    <MemoryRouter>
      <InvoiceCreateFlow project={project} onBack={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

const clickReviewInvoice = async () => {
  await screen.findByText('Pricing: 100')
  const reviewButton = screen.getByRole('button', { name: /^review invoice$/i })
  await waitFor(() => expect(reviewButton).not.toBeDisabled())
  fireEvent.click(reviewButton)
}

describe('InvoiceCreateFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    submitInvoicePayload.mockResolvedValue({
      success: true,
      invoiceId: 123,
      invoiceRefNo: 'INV-123',
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders the edit step through the shared invoice form shell', async () => {
    renderFlow()

    expect(await screen.findByText('Invoice form shell')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^review invoice$/i })).toBeInTheDocument()
  })

  it('shows review without posting, then returns to edit without losing draft state', async () => {
    renderFlow({ origin: 'invoice-list' })

    await clickReviewInvoice()

    expect(await screen.findByText(/Review the invoice details below/i)).toBeInTheDocument()
    expect(submitInvoicePayload).not.toHaveBeenCalled()
    expect(screen.getByText('Manpower Deployment')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to edit/i }))

    expect(await screen.findByText('Invoice form shell')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^review invoice$/i })).toBeInTheDocument()
  })

  it('posts once from the review step and shows page-level success for invoice-list origin', async () => {
    renderFlow({ origin: 'invoice-list' })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)
    fireEvent.click(screen.getByRole('button', { name: /^create invoice$/i }))

    await waitFor(() => expect(submitInvoicePayload).toHaveBeenCalledTimes(1))
    expect(submitInvoicePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 44,
        service_type: 'Manpower Supply',
        invoice_purpose: 'Manpower Deployment',
        amount: 100,
        breakdown: expect.any(Array),
      }),
    )
    expect(await screen.findAllByText('Invoice Created')).toHaveLength(2)
    expect(screen.getByText(/INV-123 was created successfully/i)).toBeInTheDocument()
  })

  it('success actions navigate to invoice list and manage project', async () => {
    renderFlow({ origin: 'invoice-list' })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)
    fireEvent.click(screen.getByRole('button', { name: /^create invoice$/i }))
    await screen.findAllByText('Invoice Created')

    fireEvent.click(screen.getByRole('button', { name: /return to invoice list/i }))
    expect(navigateMock).toHaveBeenCalledWith('/commercial/invoice')

    fireEvent.click(screen.getByRole('button', { name: /manage project/i }))
    expect(navigateMock).toHaveBeenCalledWith('/project/manage/44')
  })

  it('preserves project-origin behavior by navigating to invoice detail after creation', async () => {
    renderFlow()

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)
    fireEvent.click(screen.getByRole('button', { name: /^create invoice$/i }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/commercial/invoice/123'))
    expect(screen.queryByText(/INV-123 was created successfully/i)).not.toBeInTheDocument()
  })
})
