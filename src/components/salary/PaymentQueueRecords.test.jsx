import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import PaymentQueueRecords from './PaymentQueueRecords'

const storageMock = vi.hoisted(() => ({
  fetchPaymentQueue: vi.fn(),
  fetchPaymentQueueDetail: vi.fn(),
  markPaymentQueuePaid: vi.fn(),
}))

vi.mock('./paymentQueueStorage', () => ({
  fetchPaymentQueue: storageMock.fetchPaymentQueue,
  fetchPaymentQueueDetail: storageMock.fetchPaymentQueueDetail,
  markPaymentQueuePaid: storageMock.markPaymentQueuePaid,
}))

describe('PaymentQueueRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.fetchPaymentQueue.mockResolvedValue([
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
        restricted: false,
      },
    ])
    storageMock.fetchPaymentQueueDetail.mockResolvedValue({
      row: {
        id: '10:2026-05',
        staffId: 10,
        staffName: 'Staff Example',
        period: '2026-05',
        status: 'Blocked',
        blockReason:
          'Multiple approved salary records exist for this employee and period. Resolve duplicates before payment.',
        canMarkPaid: false,
        restricted: false,
      },
      items: [
        {
          subjectType: 'salary_application',
          subjectId: 100,
          label: 'May 2026',
          status: 'Approved',
          amount: 3708.95,
        },
      ],
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows blocked queue state and suppresses mark paid action', async () => {
    render(<PaymentQueueRecords />)

    await waitFor(() => {
      expect(screen.getByText('Staff Example')).toBeInTheDocument()
    })

    const row = screen.getByText('Staff Example').closest('tr')
    expect(within(row).getByText('Blocked')).toBeInTheDocument()
    expect(
      within(row).getByText(
        'Multiple approved salary records exist for this employee and period. Resolve duplicates before payment.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(within(row).getByRole('button', { name: /view/i }))

    await waitFor(() => {
      expect(screen.getByText('Payment Queue Detail')).toBeInTheDocument()
    })
    expect(
      screen.getAllByText(
        'Multiple approved salary records exist for this employee and period. Resolve duplicates before payment.',
      ).length,
    ).toBeGreaterThan(1)
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument()
  })
})
