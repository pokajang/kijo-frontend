import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchJson } from '../../../utils/detailPages'
import Debtors from './Debtors'

const recordListMock = vi.hoisted(() => vi.fn())
const paymentModalMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({ default: () => null }))
vi.mock('../../../components/stats', () => ({ StatsStrip: () => null }))
vi.mock('../../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      {title}
      {children}
    </div>
  ),
  DataTableRecordControls: ({ children, searchValue, onSearchChange, searchPlaceholder }) => (
    <div>
      <input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
      />
      {children}
    </div>
  ),
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
vi.mock('../../../components/toast/toastService', () => ({ showToast: showToastMock }))
vi.mock('./DebtorUpdatePaymentModal', () => ({
  default: (props) => {
    paymentModalMock(props)
    return null
  },
}))

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

    const props = await waitFor(() => {
      const renderedProps = [...recordListMock.mock.calls]
        .map(([value]) => value)
        .reverse()
        .find((value) => value.rows.length > 0)

      expect(renderedProps).toBeDefined()
      return renderedProps
    })
    const row = props.rows[0]

    expect(props.storageKey).toBe('commercial.debtors.visible-columns.v4')
    expect(props.dataColumns.map((column) => column.key)).toContain('paid')
    expect(props.dataColumns.map((column) => column.key)).toContain('lastPayment')
    expect(props.dataColumns.map((column) => column.key)).toContain('outstanding')
    expect(props.renderCell(row, { key: 'paid' })).toBe('RM 300.00')
    expect(props.renderCell(row, { key: 'outstanding' })).toBe('RM 700.00')
    expect(props.getActions(row).map((action) => action.label)).toEqual([
      'Edit',
      'Update Payment',
      'Delete',
    ])
  })

  it('keeps lifecycle scopes visible and requests paid debtors when Paid is selected', async () => {
    fetchJson.mockImplementation((url) =>
      Promise.resolve({
        status: 'success',
        debtors: url.includes('status=paid')
          ? [
              {
                sourceType: 'manual',
                sourceId: 2,
                invoiceRef: 'MAN-PAID',
                client: 'Client Paid',
                invoiceDate: '2026-07-01',
                grandTotal: 500,
                paidTotal: 500,
                outstandingAmount: 0,
                lastPaymentDate: '2026-08-03',
                paymentStatus: 'Paid',
                status: 'Paid',
              },
            ]
          : [],
      }),
    )

    render(
      <MemoryRouter>
        <Debtors />
      </MemoryRouter>,
    )

    const paidTab = screen.getByRole('tab', { name: 'Paid' })
    await waitFor(() => expect(paidTab).not.toBeDisabled())
    fireEvent.click(paidTab)

    await waitFor(() =>
      expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining('status=paid')),
    )
    await waitFor(() => expect(recordListMock.mock.calls.at(-1)[0].rows[0]?.status).toBe('Paid'))
    const props = recordListMock.mock.calls.at(-1)[0]
    expect(props.getActions(props.rows[0]).map((action) => action.label)).toEqual([
      'Edit',
      'Payment History',
      'Delete',
    ])
    expect(props.renderCell(props.rows[0], { key: 'lastPayment' })).toBe('2026-08-03')
  })

  it('restores a shareable paid scope from the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/commercial/debtors?status=paid']}>
        <Debtors />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining('status=paid')),
    )
    expect(screen.getByRole('tab', { name: 'Paid' })).toHaveAttribute('aria-selected', 'true')
  })

  it('explains that a completed payment moved to Paid', async () => {
    render(
      <MemoryRouter>
        <Debtors />
      </MemoryRouter>,
    )

    await waitFor(() => expect(recordListMock).toHaveBeenCalled())
    const tableProps = recordListMock.mock.calls.at(-1)[0]
    const row = tableProps.rows[0]
    await act(async () => {
      tableProps
        .getActions(row)
        .find((action) => action.key === 'update-payment')
        .onClick(row)
    })

    fetchJson.mockResolvedValueOnce({
      status: 'success',
      summary: { outstandingAmount: 0, paymentStatus: 'Paid' },
    })
    fetchJson.mockResolvedValueOnce({ status: 'success', debtors: [] })
    const modalProps = paymentModalMock.mock.calls.at(-1)[0]

    await act(async () => {
      await modalProps.onConfirm({ payment_type: 'full', payment_date: '2026-08-05' })
    })

    expect(showToastMock).toHaveBeenCalledWith(
      'Payment completed. This record is now available under Paid.',
    )
  })

  it('keeps cancelled payment history accessible without allowing another payment', async () => {
    fetchJson.mockResolvedValue({
      status: 'success',
      debtors: [
        {
          sourceType: 'manual',
          sourceId: 9,
          invoiceRef: 'MAN-CANCELLED',
          client: 'Cancelled Client',
          invoiceDate: '2026-07-01',
          grandTotal: 1000,
          paidTotal: 300,
          outstandingAmount: 700,
          hasPaymentHistory: true,
          paymentStatus: 'Partially Paid',
          status: 'Cancelled',
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/commercial/debtors?status=cancelled']}>
        <Debtors />
      </MemoryRouter>,
    )

    await waitFor(() => expect(recordListMock.mock.calls.at(-1)[0].rows).toHaveLength(1))
    const tableProps = recordListMock.mock.calls.at(-1)[0]
    const row = tableProps.rows[0]
    expect(tableProps.getActions(row).map((action) => action.label)).toEqual([
      'Edit',
      'Payment History',
      'Delete',
    ])

    await act(async () => {
      tableProps
        .getActions(row)
        .find((action) => action.key === 'payment-history')
        .onClick(row)
    })

    expect(paymentModalMock.mock.calls.at(-1)[0]).toMatchObject({
      debtor: expect.objectContaining({ invoiceRef: 'MAN-CANCELLED' }),
      historyOnly: true,
      visible: true,
    })
  })

  it('ignores an older debtor response after a newer search finishes', async () => {
    let resolveOldRequest
    fetchJson
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOldRequest = resolve
          }),
      )
      .mockResolvedValueOnce({
        status: 'success',
        debtors: [
          {
            sourceType: 'manual',
            sourceId: 12,
            invoiceRef: 'LATEST-RESULT',
            client: 'Latest Client',
            status: 'Open',
          },
        ],
      })

    render(
      <MemoryRouter>
        <Debtors />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchJson).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByPlaceholderText('Type to search...'), {
      target: { value: 'latest' },
    })
    await waitFor(() =>
      expect(recordListMock.mock.calls.at(-1)[0].rows[0]?.invoiceRef).toBe('LATEST-RESULT'),
    )

    await act(async () => {
      resolveOldRequest({
        status: 'success',
        debtors: [
          {
            sourceType: 'manual',
            sourceId: 11,
            invoiceRef: 'STALE-RESULT',
            client: 'Stale Client',
            status: 'Open',
          },
        ],
      })
    })

    expect(recordListMock.mock.calls.at(-1)[0].rows[0]?.invoiceRef).toBe('LATEST-RESULT')
  })
})
