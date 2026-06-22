import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InvoiceCreateFlow from './InvoiceCreateFlow'

const navigateMock = vi.hoisted(() => vi.fn())
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

vi.mock('@coreui/react', async () => {
  const actual = await vi.importActual('@coreui/react')
  return {
    ...actual,
    CTooltip: ({ children }) => children,
  }
})

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

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
  submitInvoicePayload: vi.fn(),
}))

const project = {
  id: 501,
  project_name: 'Manual Special Project',
  project_type: 'Special',
  quote_id: null,
  quote_value: 5000,
  description: 'Manual project scope',
  client_name: 'Client A',
  client_pics: [{ full_name: 'PIC A' }],
  status: 'Active',
}

const renderFlow = ({ projectOverride, draft } = {}) => {
  const nextProject = { ...project, ...(projectOverride || {}) }
  if (draft) {
    localStorage.setItem(`invoiceDraft:${nextProject.id}`, JSON.stringify(draft))
  }

  return render(
    <MemoryRouter>
      <InvoiceCreateFlow project={nextProject} onBack={vi.fn()} />
    </MemoryRouter>,
  )
}

const getSpecialBreakdownRows = (container) =>
  Array.from(container.querySelectorAll('tbody tr')).filter((row) =>
    row.closest('.quote-line-items-table-shell'),
  )

describe('InvoiceCreateFlow manual Special invoice seeding with real form shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    commercialDocsMock.docs = { invoices: [] }
    commercialDocsMock.groups = []
    commercialDocsMock.loading = false
    commercialDocsMock.error = ''
    commercialDocsMock.hasExistingDocs = false
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('seeds a manual Special project line before Discount when no draft exists', async () => {
    const { container } = renderFlow()

    await waitFor(() => {
      const rows = getSpecialBreakdownRows(container)
      expect(within(rows[0]).getByDisplayValue('Manual Special Project')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Discount (RM)')).toBeInTheDocument()
    })

    const rows = getSpecialBreakdownRows(container)
    expect(within(rows[0]).getByDisplayValue('Manual project scope')).toBeInTheDocument()
    expect(within(rows[0]).getByDisplayValue('5000')).toBeInTheDocument()
  })

  it('seeds a manual Special Service project line before Discount when no draft exists', async () => {
    const { container } = renderFlow({
      projectOverride: {
        id: 502,
        project_type: 'Special Service',
        project_name: 'Manual Special Service Project',
        quote_value: 6500,
        description: 'Manual special service scope',
      },
    })

    await waitFor(() => {
      const rows = getSpecialBreakdownRows(container)
      expect(
        within(rows[0]).getByDisplayValue('Manual Special Service Project'),
      ).toBeInTheDocument()
      expect(within(rows[1]).getByText('Discount (RM)')).toBeInTheDocument()
    })

    const rows = getSpecialBreakdownRows(container)
    expect(within(rows[0]).getByDisplayValue('Manual special service scope')).toBeInTheDocument()
    expect(within(rows[0]).getByDisplayValue('6500')).toBeInTheDocument()
  })

  it('seeds a manual Special project line after loading a stale empty draft', async () => {
    const { container } = renderFlow({
      draft: {
        version: 1,
        pricing: {
          special_items: [],
          discount_qty: 1,
          discount_unit: 'Lot',
          discount: 0,
          sst_percent: 0,
        },
      },
    })

    await waitFor(() => {
      const rows = getSpecialBreakdownRows(container)
      expect(within(rows[0]).getByDisplayValue('Manual Special Project')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Discount (RM)')).toBeInTheDocument()
    })
  })

  it('does not immediately re-seed after the seeded manual Special row is removed', async () => {
    const { container } = renderFlow()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove invoice item 1/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /remove invoice item 1/i }))

    await waitFor(() => {
      const rows = getSpecialBreakdownRows(container)
      expect(within(rows[0]).getByText('Discount (RM)')).toBeInTheDocument()
    })
    const rows = getSpecialBreakdownRows(container)
    expect(within(rows[0]).queryByDisplayValue('Manual Special Project')).not.toBeInTheDocument()
  })
})
