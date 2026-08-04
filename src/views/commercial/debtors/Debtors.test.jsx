import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchJson } from '../../../utils/detailPages'
import Debtors from './Debtors'

const recordListMock = vi.hoisted(() => vi.fn())

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({ default: () => null }))
vi.mock('../../../components/stats', () => ({ StatsStrip: () => null }))
vi.mock('../../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      {title}
      {children}
    </div>
  ),
  DataTableRecordControls: ({ children }) => <div>{children}</div>,
  DataTableRecordList: (props) => {
    recordListMock(props)
    return <div data-testid="debtors-table" />
  },
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
  DataTableStatsToggle: () => null,
}))
vi.mock('../../../hooks/datatable', () => ({
  useDataTableStatsVisibility: () => ({
    statsVisible: false,
    toggleStatsVisible: vi.fn(),
    controlsVisible: true,
    toggleControlsVisible: vi.fn(),
  }),
}))
vi.mock('../../../utils/detailPages', () => ({ fetchJson: vi.fn() }))
vi.mock('./DebtorUpdatePaymentModal', () => ({ default: () => null }))

describe('Debtors payment table wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchJson.mockResolvedValue({
      status: 'success',
      debtors: [
        {
          sourceType: 'manual',
          sourceId: 1,
          invoiceRef: 'MAN-001',
          client: 'Client A',
          invoiceDate: '2026-08-01',
          grandTotal: 1000,
          paidTotal: 300,
          outstandingAmount: 700,
          paymentStatus: 'Partially Paid',
          status: 'Partially Paid',
        },
      ],
    })
  })

  afterEach(() => cleanup())

  it('exposes paid, outstanding and Update Payment for partially paid debtors', async () => {
    render(
      <MemoryRouter>
        <Debtors />
      </MemoryRouter>,
    )

    await waitFor(() => expect(recordListMock).toHaveBeenCalled())
    const props = recordListMock.mock.calls.at(-1)[0]
    const row = props.rows[0]

    expect(props.storageKey).toBe('commercial.debtors.visible-columns.v3')
    expect(props.dataColumns.map((column) => column.key)).toContain('paid')
    expect(props.dataColumns.map((column) => column.key)).toContain('outstanding')
    expect(props.renderCell(row, { key: 'paid' })).toBe('RM 300.00')
    expect(props.renderCell(row, { key: 'outstanding' })).toBe('RM 700.00')
    expect(props.getActions(row).map((action) => action.label)).toEqual([
      'Edit',
      'Update Payment',
      'Delete',
    ])
  })
})
