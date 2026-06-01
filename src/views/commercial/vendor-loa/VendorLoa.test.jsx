import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VendorLoa from './VendorLoa'
import { listActiveProjectOptions } from '../../project/manage/projectApi'
import { fetchAllPagedRecords, fetchJson } from '../../../utils/detailPages'

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

vi.mock('../../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      <strong>{title}</strong>
      {children}
    </div>
  ),
  DataTableLoadingState: ({ message }) => <div>{message}</div>,
  DataTableRecordControls: ({ children }) => <div>{children}</div>,
  DataTableStatsToggle: () => null,
}))

vi.mock('../../../utils/detailPages', () => ({
  fetchAllPagedRecords: vi.fn(),
  fetchJson: vi.fn(),
}))

vi.mock('../../project/manage/projectApi', () => ({
  listActiveProjectOptions: vi.fn(),
}))

vi.mock('./VendorLoaTable', () => ({
  default: () => <div data-testid="vendor-loa-table">Vendor LOA table</div>,
}))

const renderVendorLoa = () =>
  render(
    <MemoryRouter>
      <VendorLoa />
    </MemoryRouter>,
  )

describe('VendorLoa create flow entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchJson.mockResolvedValue({ status: 'success', staff: { roles: [] } })
    fetchAllPagedRecords.mockResolvedValue([])
    listActiveProjectOptions.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Create Vendor LOA as a card header action', () => {
    renderVendorLoa()

    expect(screen.getByRole('button', { name: /create vendor loa/i })).toBeInTheDocument()
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

    renderVendorLoa()

    fireEvent.click(screen.getByRole('button', { name: /create vendor loa/i }))

    expect(await screen.findByText('Project Alpha for Client A')).toBeInTheDocument()
    expect(screen.getByText('Equipment Supply')).toBeInTheDocument()
    expect(screen.queryByText(/ID 12/i)).not.toBeInTheDocument()
    expect(listActiveProjectOptions).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    })
  })

  it('shows an empty state when no active projects are available', async () => {
    renderVendorLoa()

    fireEvent.click(screen.getByRole('button', { name: /create vendor loa/i }))

    expect(
      await screen.findByText(/No active projects are available for vendor LOA creation/i),
    ).toBeInTheDocument()
  })

  it('shows project loading errors in the picker', async () => {
    listActiveProjectOptions.mockRejectedValue(new Error('Unable to load projects now.'))

    renderVendorLoa()

    fireEvent.click(screen.getByRole('button', { name: /create vendor loa/i }))

    expect(await screen.findByText('Unable to load projects now.')).toBeInTheDocument()
  })

  it('navigates to vendor LOA creation for the selected project', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Equipment Supply',
      },
    ])

    renderVendorLoa()

    fireEvent.click(screen.getByRole('button', { name: /create vendor loa/i }))
    fireEvent.click(await screen.findByText('Project Alpha for Client A'))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        '/commercial/vendor-loa/create/12?from=vendor-loa-list',
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
