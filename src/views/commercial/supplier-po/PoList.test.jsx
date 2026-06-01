import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SupplierPoRecords from './PoList'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { listActiveProjectOptions } from '../../project/manage/projectApi'

const navigateMock = vi.hoisted(() => vi.fn())
const statsStripMock = vi.hoisted(() => vi.fn())
const recordListMock = vi.hoisted(() => vi.fn())

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
  StatsStrip: (props) => {
    statsStripMock(props)
    return <div data-testid="stats-strip" />
  },
}))

vi.mock('../../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      <strong>{title}</strong>
      {children}
    </div>
  ),
  DataTableLoadingState: ({ message }) => <div>{message}</div>,
  DataTableRecordControls: ({ children, searchPlaceholder }) => (
    <div>
      <input aria-label="table-search" placeholder={searchPlaceholder} />
      {children}
    </div>
  ),
  DataTableRecordList: (props) => {
    recordListMock(props)
    return <div data-testid="supplier-po-table">Supplier PO table</div>
  },
  DataTableStatsToggle: () => null,
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

vi.mock('./SupplierModal/ViewPoModal ', () => ({
  default: () => null,
}))

vi.mock('./SupplierModal/MarkSupplierPaid ', () => ({
  default: () => null,
}))

vi.mock('../../../utils/detailPages', () => ({
  fetchAllPagedRecords: vi.fn(),
}))

vi.mock('../../project/manage/projectApi', () => ({
  listActiveProjectOptions: vi.fn(),
}))

const poRows = [
  {
    po_id: 1,
    po_ref_no: 'PO-2026-001',
    supplier_name: 'Alpha Supplier',
    supplier_contact_name: 'Amy',
    supplier_contact_number: '0123456789',
    created_by_code: 'AZA',
    created_at: '2026-05-10T10:00:00Z',
    grand_total: '1500.50',
    status: 'Pending',
    items: [{ item_name: 'Laptop', quantity: 2, unit: 'units' }],
  },
  {
    po_id: 2,
    po_ref_no: 'PO-2026-002',
    supplier_name: 'Beta Supplier',
    supplier_contact_name: 'Ben',
    supplier_contact_number: '0199999999',
    created_by_name: 'Commercial Lead',
    created_at: '2026-05-12T10:00:00Z',
    grand_total: '250.00',
    status: 'Paid',
    items: [{ item_name: 'Mouse', quantity: 5, unit: 'units' }],
  },
]

const renderSupplierPoRecords = () =>
  render(
    <MemoryRouter>
      <SupplierPoRecords />
    </MemoryRouter>,
  )

describe('SupplierPoRecords table wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAllPagedRecords.mockResolvedValue(poRows)
    listActiveProjectOptions.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('uses the shared commercial table controls and Supplier PO copy', async () => {
    renderSupplierPoRecords()

    expect(screen.getByText('Supplier POs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create supplier po/i })).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search PO, supplier, contact, item, PIC'),
    ).toBeInTheDocument()
    expect(screen.getByText('Person In Charge')).toBeInTheDocument()
    expect(screen.getByText('Item')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    await waitFor(() =>
      expect(recordListMock.mock.calls.at(-1)?.[0].rows).toHaveLength(poRows.length),
    )

    const tableProps = recordListMock.mock.calls.at(-1)[0]
    expect(tableProps.storageKey).toBe('commercial.supplier-po.visible-columns.v4')
    expect(tableProps.emptyMessage).toBe('No supplier PO records found.')
    expect(tableProps.loadingMessage).toBe('Loading supplier PO records...')
    expect(tableProps.desktopUtilityPortalId).toBe('supplier-po-table-tools')
    expect(tableProps.mobileUtilityPortalId).toBe('supplier-po-mobile-table-tools')
    expect(tableProps.defaultVisibleColumns.createdBy).toBe(true)
    expect(tableProps.dataColumns.map((column) => column.key)).toEqual([
      'po',
      'supplier',
      'createdBy',
      'contact',
      'contactPhone',
      'items',
      'issued',
      'total',
      'status',
    ])
    expect(tableProps.rows[0]).toMatchObject({
      po: 'PO-2026-001',
      supplier: 'Alpha Supplier',
      createdBy: 'AZA',
      totalDisplay: '1500.50',
    })
    expect(tableProps.getMobileMeta(tableProps.rows[0])).toBe('2026-05-10 | RM 1500.50')
    expect(fetchAllPagedRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        dataKeys: ['data'],
        perPage: 100,
      }),
    )
    expect(statsStripMock.mock.calls.at(-1)[0]).toMatchObject({
      loading: false,
    })
  })

  it('matches commercial action naming and disables Mark Paid for paid POs', async () => {
    renderSupplierPoRecords()

    await waitFor(() =>
      expect(recordListMock.mock.calls.at(-1)?.[0].rows).toHaveLength(poRows.length),
    )

    const tableProps = recordListMock.mock.calls.at(-1)[0]
    const pendingActions = tableProps.getActions(tableProps.rows[0])
    expect(pendingActions.map((action) => action.label)).toEqual([
      'View',
      'Preview',
      'PDF PO',
      'Mark Paid',
      'Delete',
    ])
    expect(pendingActions.find((action) => action.key === 'mark-paid')).toMatchObject({
      disabled: false,
    })

    const paidActions = tableProps.getActions(tableProps.rows[1])
    expect(paidActions.find((action) => action.key === 'mark-paid')).toMatchObject({
      disabled: true,
      tooltip: 'Supplier PO is already paid.',
    })
  })

  it('routes list-origin Supplier PO creation through the project picker', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Equipment Supply',
      },
    ])

    renderSupplierPoRecords()

    fireEvent.click(screen.getByRole('button', { name: /create supplier po/i }))
    fireEvent.click(await screen.findByText('Project Alpha for Client A'))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(navigateMock).toHaveBeenCalledWith(
      '/commercial/supplier-po/create/12?from=supplier-po-list',
      {
        state: {
          project: expect.objectContaining({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          }),
        },
      },
    )
  })
})
