import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DeliveryOrder from './DeliveryOrder'
import { listActiveProjectOptions } from '../../project/manage/projectApi'
import { fetchAllPagedRecords } from '../../../utils/detailPages'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({
  default: () => null,
}))

vi.mock('../../../components/stats', () => ({
  StatsStrip: () => null,
}))

vi.mock('../../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      <strong>{title}</strong>
      {children}
    </div>
  ),
  DataTableLoadingState: ({ message }) => <div>{message}</div>,
  DataTableRecordControls: ({ children }) => <div>{children}</div>,
  DataTableRecordList: () => <div data-testid="delivery-order-table">Delivery order table</div>,
  DataTableStatsToggle: () => null,
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

vi.mock('./DoModal/DoViewModal', () => ({
  default: () => null,
}))

vi.mock('./DoModal/DoEditModalMain', () => ({
  default: () => null,
}))

vi.mock('../../../utils/detailPages', () => ({
  fetchAllPagedRecords: vi.fn(),
}))

vi.mock('../../project/manage/projectApi', () => ({
  listActiveProjectOptions: vi.fn(),
}))

const renderDeliveryOrder = () =>
  render(
    <MemoryRouter>
      <DeliveryOrder />
    </MemoryRouter>,
  )

describe('DeliveryOrder create flow entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAllPagedRecords.mockResolvedValue([])
    listActiveProjectOptions.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Create Delivery Order as a card header action', () => {
    renderDeliveryOrder()

    expect(screen.getByRole('button', { name: /create delivery order/i })).toBeInTheDocument()
  })

  it('opens a project picker and loads active user-scoped projects', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Equipment Supply',
      },
    ])

    renderDeliveryOrder()

    fireEvent.click(screen.getByRole('button', { name: /create delivery order/i }))

    expect(await screen.findByText('Project Alpha for Client A')).toBeInTheDocument()
    expect(screen.getByText('Equipment Supply')).toBeInTheDocument()
    expect(screen.queryByText(/ID 12/i)).not.toBeInTheDocument()
    expect(listActiveProjectOptions).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    })
  })

  it('shows an empty state when no active projects are available', async () => {
    renderDeliveryOrder()

    fireEvent.click(screen.getByRole('button', { name: /create delivery order/i }))

    expect(
      await screen.findByText(/No active projects are available for delivery order creation/i),
    ).toBeInTheDocument()
  })

  it('shows project loading errors in the picker', async () => {
    listActiveProjectOptions.mockRejectedValue(new Error('Unable to load projects now.'))

    renderDeliveryOrder()

    fireEvent.click(screen.getByRole('button', { name: /create delivery order/i }))

    expect(await screen.findByText('Unable to load projects now.')).toBeInTheDocument()
  })

  it('navigates to delivery order creation for the selected project', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Equipment Supply',
      },
    ])

    renderDeliveryOrder()

    fireEvent.click(screen.getByRole('button', { name: /create delivery order/i }))
    fireEvent.click(await screen.findByText('Project Alpha for Client A'))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        '/commercial/delivery-order/create/12?from=delivery-order-list',
        {
          state: {
            project: expect.objectContaining({
              id: 12,
              project_name: 'Project Alpha',
              project_type: 'Equipment Supply',
            }),
          },
        },
      ),
    )
  })
})
