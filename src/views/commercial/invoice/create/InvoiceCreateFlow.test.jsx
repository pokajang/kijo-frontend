import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InvoiceCreateFlow from './InvoiceCreateFlow'
import { submitInvoicePayload } from './invoiceCreateApi'

const navigateMock = vi.hoisted(() => vi.fn())
const submitInvoicePayloadMock = vi.hoisted(() => vi.fn())
const commercialDocsMock = vi.hoisted(() => ({
  docs: {
    invoices: [],
  },
  groups: [],
  loading: false,
  error: '',
  hasExistingDocs: false,
}))

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
  const MockInvoiceFormShell = ({ pricing, project, setPricing }) => {
    ReactModule.useEffect(() => {
      if (Number(pricing.sub_total) === 100) return
      if (project?.project_type === 'Special') {
        setPricing((prev) => ({
          ...prev,
          service_title: 'Special Project',
          sub_total: 100,
          grand_total: 100,
          sst_amount: 0,
          discount: 0,
          special_items: [
            {
              item_description: 'Special service',
              description: 'Manual scope',
              quantity: 2,
              unit: 'Lot',
              unit_price: 50,
            },
          ],
        }))
        return
      }
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
    }, [pricing.sub_total, project?.project_type, setPricing])

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
  useProjectCommercialDocs: () => commercialDocsMock,
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
  quote_value: 200,
  status: 'Active',
}

const renderFlow = ({ project: projectOverride, ...props } = {}) => {
  const mergedProject = { ...project, ...(projectOverride || {}) }
  const draftPricing =
    mergedProject.project_type === 'Special'
      ? {
          service_title: 'Special Project',
          sub_total: 100,
          grand_total: 100,
          sst_amount: 0,
          discount: 0,
          special_items: [
            {
              item_description: 'Special service',
              description: 'Manual scope',
              quantity: 2,
              unit: 'Lot',
              unit_price: 50,
            },
          ],
        }
      : {
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
        }

  localStorage.setItem(
    `invoiceDraft:${mergedProject.id}`,
    JSON.stringify({
      version: 1,
      pricing: draftPricing,
    }),
  )

  return render(
    <MemoryRouter>
      <InvoiceCreateFlow project={mergedProject} onBack={vi.fn()} {...props} />
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
    commercialDocsMock.docs = { invoices: [] }
    commercialDocsMock.groups = []
    commercialDocsMock.loading = false
    commercialDocsMock.error = ''
    commercialDocsMock.hasExistingDocs = false
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
    expect(screen.getByText('Project Billing')).toBeInTheDocument()
    expect(screen.getByText('Already invoiced')).toBeInTheDocument()
    expect(screen.getByText('Yet to be invoiced after this invoice')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to edit/i }))

    expect(await screen.findByText('Invoice form shell')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^review invoice$/i })).toBeInTheDocument()
  })

  it('posts once from the review step and shows page-level success for invoice-list origin', async () => {
    renderFlow({ origin: 'invoice-list' })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)
    expect(screen.queryByRole('checkbox', { name: /close project/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^create invoice$/i }))

    await waitFor(() => expect(submitInvoicePayload).toHaveBeenCalledTimes(1))
    expect(submitInvoicePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 44,
        service_type: 'Manpower Supply',
        invoice_purpose: 'Manpower Deployment',
        amount: 100,
        close_project: false,
        breakdown: expect.any(Array),
      }),
    )
    expect(await screen.findAllByText('Invoice Created')).toHaveLength(2)
    expect(screen.getByText(/INV-123 was created successfully/i)).toBeInTheDocument()
  })

  it('allows manually created Special projects to review an invoice without a quote id', async () => {
    renderFlow({
      project: {
        id: 45,
        project_name: 'Special Project',
        project_type: 'Special',
        quote_id: null,
        quote_value: 100,
      },
      origin: 'invoice-list',
    })

    await clickReviewInvoice()

    expect(await screen.findByText(/Review the invoice details below/i)).toBeInTheDocument()
    expect(screen.getByText('Special service')).toBeInTheDocument()
    expect(submitInvoicePayload).not.toHaveBeenCalled()
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

  it('can request project closure when this invoice leaves no uninvoiced value', async () => {
    commercialDocsMock.docs = {
      invoices: [{ id: 1, invoice_ref_no: 'INV-001', status: 'Pending', grand_total: 100 }],
    }
    submitInvoicePayload.mockResolvedValue({
      success: true,
      invoiceId: 123,
      invoiceRefNo: 'INV-123',
      projectClosed: true,
    })
    renderFlow({ origin: 'invoice-list' })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)
    expect(screen.getByText('RM 200.00')).toBeInTheDocument()
    expect(screen.getAllByText('RM 100.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('RM 0.00').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByRole('checkbox', { name: /close project/i }))
    fireEvent.click(screen.getByRole('button', { name: /^create invoice$/i }))

    await waitFor(() => expect(submitInvoicePayload).toHaveBeenCalledTimes(1))
    expect(submitInvoicePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        close_project: true,
      }),
    )
    expect(await screen.findByText('Project status was marked Completed.')).toBeInTheDocument()
  })

  it('displays tolerance-sized remaining value as zero when project can close', async () => {
    commercialDocsMock.docs = {
      invoices: [{ id: 1, invoice_ref_no: 'INV-001', status: 'Pending', grand_total: 100 }],
    }
    renderFlow({
      project: {
        quote_value: 200.009,
        status: 'Active',
      },
    })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)

    expect(screen.getByRole('checkbox', { name: /close project/i })).toBeInTheDocument()
    const remainingLabel = screen.getByText('Yet to be invoiced after this invoice')
    expect(remainingLabel.nextElementSibling).toHaveTextContent('RM 0.00')
  })

  it('does not offer project closure when only cancelled invoices would cover project value', async () => {
    commercialDocsMock.docs = {
      invoices: [
        { id: 1, invoice_ref_no: 'INV-001', status: 'Pending', grand_total: 100 },
        { id: 2, invoice_ref_no: 'INV-002', status: 'Cancelled', grand_total: 800 },
      ],
    }
    renderFlow({
      project: {
        quote_value: 1000,
        status: 'Active',
      },
    })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)

    expect(screen.getByText('RM 1,000.00')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /close project/i })).not.toBeInTheDocument()
  })

  it('does not offer project closure for non-active projects', async () => {
    commercialDocsMock.docs = {
      invoices: [{ id: 1, invoice_ref_no: 'INV-001', status: 'Pending', grand_total: 100 }],
    }
    renderFlow({
      project: {
        status: 'Terminated',
      },
    })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)

    expect(screen.queryByRole('checkbox', { name: /close project/i })).not.toBeInTheDocument()
  })

  it('does not offer project closure when closure details already exist', async () => {
    commercialDocsMock.docs = {
      invoices: [{ id: 1, invoice_ref_no: 'INV-001', status: 'Pending', grand_total: 100 }],
    }
    renderFlow({
      project: {
        status: 'Active',
        closing_details: {
          close_date: '2026-06-01',
        },
      },
    })

    await clickReviewInvoice()
    await screen.findByText(/Review the invoice details below/i)

    expect(screen.queryByRole('checkbox', { name: /close project/i })).not.toBeInTheDocument()
  })
})
