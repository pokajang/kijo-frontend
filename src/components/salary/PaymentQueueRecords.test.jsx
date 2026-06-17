import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PaymentQueueRecords from './PaymentQueueRecords'

const storageMock = vi.hoisted(() => ({
  fetchPaymentQueue: vi.fn(),
  markPaymentQueuePaid: vi.fn(),
  undoPaymentQueuePaid: vi.fn(),
  bulkMarkPaymentQueuePaid: vi.fn(),
  bulkUndoPaymentQueuePaid: vi.fn(),
}))

vi.mock('./paymentQueueStorage', () => ({
  fetchPaymentQueue: storageMock.fetchPaymentQueue,
  markPaymentQueuePaid: storageMock.markPaymentQueuePaid,
  undoPaymentQueuePaid: storageMock.undoPaymentQueuePaid,
  bulkMarkPaymentQueuePaid: storageMock.bulkMarkPaymentQueuePaid,
  bulkUndoPaymentQueuePaid: storageMock.bulkUndoPaymentQueuePaid,
}))

const rows = [
  {
    id: '10:2026-05',
    staffId: 10,
    staffName: 'Staff Example',
    staffCode: 'STA',
    period: '2026-05',
    periodLabel: 'May 2026',
    salaryDue: 4908.95,
    otherClaimDue: 0,
    totalDue: 4908.95,
    itemCount: 2,
    salaryCount: 2,
    otherClaimCount: 0,
    status: 'Blocked',
    blockReason:
      'Multiple approved salary records exist for this employee and period. Resolve duplicates before payment.',
    canViewValues: true,
    canMarkPaid: false,
    canUndoPaid: false,
    restricted: false,
  },
  {
    id: '11:2026-06',
    staffId: 11,
    staffName: 'Paid Staff',
    staffCode: 'PSD',
    period: '2026-06',
    periodLabel: 'June 2026',
    salaryDue: 3200,
    otherClaimDue: 12.34,
    totalDue: 3212.34,
    itemCount: 2,
    status: 'Paid',
    canViewValues: true,
    canMarkPaid: false,
    canUndoPaid: true,
    restricted: false,
  },
  {
    id: '12:2026-06',
    staffId: 12,
    staffName: 'Pending Staff',
    staffCode: 'PEN',
    period: '2026-06',
    periodLabel: 'June 2026',
    salaryDue: 3000,
    otherClaimDue: 0,
    totalDue: 3000,
    itemCount: 1,
    status: 'Pending Payment',
    canViewValues: true,
    canMarkPaid: true,
    canUndoPaid: false,
    restricted: false,
  },
  {
    id: 'restricted:2026-06',
    staffId: null,
    staffName: 'Restricted',
    staffCode: '',
    period: '2026-06',
    periodLabel: 'June 2026',
    salaryDue: null,
    otherClaimDue: null,
    totalDue: null,
    itemCount: null,
    status: 'Pending Payment',
    canViewValues: false,
    canMarkPaid: false,
    canUndoPaid: false,
    restricted: true,
  },
]

const renderPaymentQueue = () =>
  render(
    <MemoryRouter initialEntries={['/financial/payment-queue']}>
      <Routes>
        <Route path="/financial/payment-queue" element={<PaymentQueueRecords />} />
        <Route
          path="/financial/payment-queue/:staffId/:period"
          element={<div>Payment queue detail route</div>}
        />
      </Routes>
    </MemoryRouter>,
  )

const getDesktopRow = (name) =>
  screen
    .getAllByText(name)
    .map((element) => element.closest('tr'))
    .find(Boolean)

describe('PaymentQueueRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.fetchPaymentQueue.mockResolvedValue(rows)
    storageMock.markPaymentQueuePaid.mockResolvedValue({ message: 'Payment marked as paid.' })
    storageMock.undoPaymentQueuePaid.mockResolvedValue({ message: 'Payment was undone.' })
    storageMock.bulkMarkPaymentQueuePaid.mockResolvedValue({
      message: 'Bulk mark paid completed.',
      summary: { success: 1, skipped: 1, failed: 0 },
    })
    storageMock.bulkUndoPaymentQueuePaid.mockResolvedValue({
      message: 'Bulk undo paid completed.',
      summary: { success: 1, skipped: 1, failed: 0 },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders shared table controls and row payment actions', async () => {
    renderPaymentQueue()

    await waitFor(() => {
      expect(screen.getAllByText('Staff Example').length).toBeGreaterThan(0)
    })

    expect(screen.getByPlaceholderText('Search staff, month, or status')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0)
    expect(screen.getByText('Visible Total')).toBeInTheDocument()
    expect(screen.getByText('RM 11121.29')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /columns/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /csv/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^view$/i })).not.toBeInTheDocument()

    const blockedRow = getDesktopRow('Staff Example')
    expect(within(blockedRow).getByText('Blocked')).toBeInTheDocument()
    expect(
      within(blockedRow).getByText(
        'Multiple approved salary records exist for this employee and period. Resolve duplicates before payment.',
      ),
    ).toBeInTheDocument()
    expect(within(blockedRow).getByRole('button', { name: /mark paid/i })).toBeDisabled()

    const paidRow = getDesktopRow('Paid Staff')
    expect(within(paidRow).getByRole('button', { name: /undo paid/i })).toBeEnabled()

    const pendingRow = getDesktopRow('Pending Staff')
    expect(within(pendingRow).getByRole('button', { name: /mark paid/i })).toBeEnabled()

    const restrictedRow = getDesktopRow('Restricted')
    expect(within(restrictedRow).getAllByText('Restricted').length).toBeGreaterThan(0)
    expect(within(restrictedRow).getByRole('button', { name: /mark paid/i })).toBeDisabled()
  })

  it('navigates to detail route on row click', async () => {
    renderPaymentQueue()

    await waitFor(() => {
      expect(screen.getAllByText('Pending Staff').length).toBeGreaterThan(0)
    })

    fireEvent.click(within(getDesktopRow('Pending Staff')).getByText('Pending Staff'))

    await waitFor(() => {
      expect(screen.getByText('Payment queue detail route')).toBeInTheDocument()
    })
  })

  it('filters by status with active chips and reset', async () => {
    renderPaymentQueue()

    await waitFor(() => {
      expect(screen.getAllByText('Pending Staff').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced filters' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'Paid' },
    })

    expect(screen.getByText('Status: Paid')).toBeInTheDocument()
    expect(screen.getAllByText('Paid Staff').length).toBeGreaterThan(0)
    expect(screen.queryByText('Pending Staff')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /reset filters/i })[0])

    await waitFor(() => {
      expect(screen.getAllByText('Pending Staff').length).toBeGreaterThan(0)
    })
  })

  it('supports bulk mark and undo actions with mixed selected rows', async () => {
    renderPaymentQueue()

    await waitFor(() => {
      expect(screen.getAllByText('Pending Staff').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByLabelText('Select Pending Staff'))
    fireEvent.click(screen.getByLabelText('Select Paid Staff'))
    fireEvent.click(screen.getByRole('button', { name: /mark paid selected/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /^mark paid$/i }).at(-1))

    await waitFor(() => {
      expect(storageMock.bulkMarkPaymentQueuePaid).toHaveBeenCalledTimes(1)
    })
    expect(storageMock.bulkMarkPaymentQueuePaid.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ staffName: 'Pending Staff' }),
        expect.objectContaining({ staffName: 'Paid Staff' }),
      ]),
    )
    expect(storageMock.bulkMarkPaymentQueuePaid.mock.calls[0][0]).toHaveLength(2)

    await waitFor(() => {
      expect(screen.getAllByText('Paid Staff').length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByLabelText('Select Pending Staff'))
    fireEvent.click(screen.getByLabelText('Select Paid Staff'))
    fireEvent.click(screen.getByRole('button', { name: /undo paid selected/i }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Wrong batch.' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: /^undo paid$/i }).at(-1))

    await waitFor(() => {
      expect(storageMock.bulkUndoPaymentQueuePaid).toHaveBeenCalledTimes(1)
    })
    expect(storageMock.bulkUndoPaymentQueuePaid.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ staffName: 'Pending Staff' }),
        expect.objectContaining({ staffName: 'Paid Staff' }),
      ]),
    )
    expect(storageMock.bulkUndoPaymentQueuePaid.mock.calls[0][0]).toHaveLength(2)
  })
})
