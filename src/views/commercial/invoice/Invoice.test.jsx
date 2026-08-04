import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Invoice from './Invoice'
import { fetchAllInvoices } from './actionHandlers'
import { listActiveProjectOptions } from '../../project/manage/projectApi'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('./InvoiceTable', () => ({
  default: () => <div data-testid="invoice-table">Invoice table</div>,
}))

vi.mock('./InvoiceModal/ViewInvoiceModal', () => ({
  default: () => null,
}))

vi.mock('./InvoiceModal/edit/EditInvoiceModal', () => ({
  default: () => null,
}))

vi.mock('./InvoiceModal/MarkPaidModal', () => ({
  default: () => null,
}))

vi.mock('./InvoiceModal/UpdateHrdClaimRefModal', () => ({
  default: () => null,
}))

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({
  default: () => null,
}))

vi.mock('./actionHandlers', () => ({
  fetchAllInvoices: vi.fn(),
  handleAction: vi.fn(),
  handleDelete: vi.fn(),
  handleMarkPaidConfirmed: vi.fn(),
  handlePaymentReversal: vi.fn(),
  handleMarkUnpaidConfirmed: vi.fn(),
  handleUpdateHrdClaimRefConfirmed: vi.fn(),
}))

vi.mock('../../project/manage/projectApi', () => ({
  listActiveProjectOptions: vi.fn(),
}))

const renderInvoice = () =>
  render(
    <MemoryRouter>
      <Invoice />
    </MemoryRouter>,
  )

describe('Invoice create flow entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAllInvoices.mockImplementation((setInvoices, setLoading) => {
      setInvoices([])
      setLoading(false)
    })
    listActiveProjectOptions.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Create Invoice as an invoice card header action', () => {
    renderInvoice()

    expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
  })

  it('opens a project picker and loads active user-scoped projects', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        projectName: 'Project Alpha',
        clientName: 'Client A',
        projectType: 'Training',
        quoteValue: '14310',
      },
    ])

    renderInvoice()

    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }))

    expect(await screen.findByText('Project Alpha for Client A')).toBeInTheDocument()
    expect(screen.getByText('Training')).toBeInTheDocument()
    expect(screen.queryByText('Type: Training')).not.toBeInTheDocument()
    expect(screen.getByText('RM 14,310.00')).toBeInTheDocument()
    expect(screen.queryByText('ID 12')).not.toBeInTheDocument()
    expect(listActiveProjectOptions).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    })
  })

  it('shows an empty state when no active projects are available', async () => {
    renderInvoice()

    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }))

    expect(
      await screen.findByText(/No active projects are available for invoice creation/i),
    ).toBeInTheDocument()
  })

  it('shows project loading errors in the picker', async () => {
    listActiveProjectOptions.mockRejectedValue(new Error('Unable to load projects now.'))

    renderInvoice()

    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }))

    expect(await screen.findByText('Unable to load projects now.')).toBeInTheDocument()
  })

  it('navigates to invoice creation for the selected project', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Training',
        quote_value: '14310',
      },
    ])

    renderInvoice()

    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }))
    fireEvent.click(await screen.findByText('Project Alpha for Client A'))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/commercial/invoice/create/12?from=invoice-list', {
        state: {
          project: expect.objectContaining({
            id: 12,
            project_name: 'Project Alpha',
            client_name: 'Client A',
            project_type: 'Training',
            quote_value: '14310',
            quoteValue: '14310',
          }),
        },
      }),
    )
  })
})
