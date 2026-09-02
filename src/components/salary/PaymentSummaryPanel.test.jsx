import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PaymentSummaryPanel from './PaymentSummaryPanel'

const storageMock = vi.hoisted(() => ({
  checkPaymentSummaryReadiness: vi.fn(),
  fetchPaymentSummaryCandidates: vi.fn(),
  fetchPaymentSummaries: vi.fn(),
  fetchPaymentSummary: vi.fn(),
  getFinancePaymentSummaryAttachmentUrl: vi.fn(),
  issuePaymentSummary: vi.fn(),
  markPaymentSummaryPaid: vi.fn(),
  preparePaymentSummary: vi.fn(),
  resendPaymentSummary: vi.fn(),
  revokePaymentSummary: vi.fn(),
  updatePaymentSummaryCandidatePreference: vi.fn(),
}))

vi.mock('./paymentSummaryStorage', () => storageMock)

describe('PaymentSummaryPanel', () => {
  const records = [
    {
      id: 12,
      reference: 'PAY-202608-R02',
      paymentPeriod: '2026-08',
      revision: 2,
      recipientName: 'Amin Rozak',
      status: 'Issued',
      grandTotal: 12345.67,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.fetchPaymentSummaries.mockResolvedValue({
      records,
      defaults: { recipientEmail: 'aminrozak@amiosh.com', recipientName: 'Amin Rozak' },
    })
    storageMock.fetchPaymentSummary.mockResolvedValue({})
    storageMock.fetchPaymentSummaryCandidates.mockResolvedValue([
      {
        key: 'other_claim_application:41',
        subjectType: 'other_claim_application',
        subjectId: 41,
        recordVersion: 3,
        staffName: 'Test Staff',
        staffCode: 'TST',
        label: 'OC-000041',
        period: '2026-08',
        amount: 225.5,
        approvedAt: '2026-08-20T10:00:00Z',
        waitingDays: 8,
        priority: 'Normal',
        eligible: true,
      },
    ])
    storageMock.checkPaymentSummaryReadiness.mockResolvedValue({
      readiness: {
        ready: true,
        employees: 1,
        selectedCount: 1,
        grandTotal: 225.5,
        warnings: [],
        blockers: [],
      },
    })
    storageMock.resendPaymentSummary.mockResolvedValue({ message: 'Secure link resent.' })
  })

  afterEach(cleanup)

  it('renders a readable mobile summary card alongside the desktop table', async () => {
    render(<PaymentSummaryPanel />)

    expect(
      await screen.findByRole('button', { name: 'Preview payment summary PAY-202608-R02' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('PAY-202608-R02')).toHaveLength(2)
    expect(screen.getAllByText('Amin Rozak')).toHaveLength(2)
    expect(screen.getAllByText('RM 12,345.67')).toHaveLength(2)
  })

  it('opens the selected summary from the mobile card and preserves lifecycle actions', async () => {
    render(<PaymentSummaryPanel />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Preview payment summary PAY-202608-R02' }),
    )
    await waitFor(() => expect(storageMock.fetchPaymentSummary).toHaveBeenCalledWith(12))

    fireEvent.click(screen.getAllByRole('button', { name: 'Resend' }).at(-1))
    await waitFor(() => expect(storageMock.resendPaymentSummary).toHaveBeenCalledWith(12))
  })

  it('starts with an empty batch and checks readiness only for explicitly selected requests', async () => {
    render(<PaymentSummaryPanel />)

    fireEvent.click(await screen.findByRole('button', { name: 'Prepare Payment Summary' }))
    expect(
      await screen.findByText(
        'Nothing is included automatically. Unselected requests remain in the Finance queue.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check readiness' })).toBeDisabled()

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select OC-000041 for Test Staff' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Check readiness' }))

    await waitFor(() =>
      expect(storageMock.checkPaymentSummaryReadiness).toHaveBeenCalledWith(
        [
          {
            subject_type: 'other_claim_application',
            subject_id: 41,
            record_version: 3,
          },
        ],
        null,
      ),
    )
  })

  it('requires a defer date and removes a deferred request from selection', async () => {
    storageMock.updatePaymentSummaryCandidatePreference.mockResolvedValue({
      record: {
        ...(await storageMock.fetchPaymentSummaryCandidates())[0],
        priority: 'Deferred',
        deferUntil: '2026-09-15',
        eligible: false,
        exclusionReason: 'Deferred until 15 Sep 2026.',
      },
    })
    render(<PaymentSummaryPanel />)
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare Payment Summary' }))
    fireEvent.click(
      (await screen.findAllByRole('checkbox', { name: 'Select OC-000041 for Test Staff' }))[0],
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit scheduling' })[0])
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'Deferred' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save scheduling' }))
    expect(await screen.findByText('Choose a future defer-until date.')).toBeInTheDocument()
    expect(storageMock.updatePaymentSummaryCandidatePreference).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Defer until'), {
      target: { value: '2026-09-15' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save scheduling' }))
    await waitFor(() =>
      expect(storageMock.updatePaymentSummaryCandidatePreference).toHaveBeenCalledWith({
        subject_type: 'other_claim_application',
        subject_id: 41,
        priority: 'Deferred',
        defer_until: '2026-09-15',
        remarks: '',
      }),
    )
    expect(screen.getByRole('button', { name: 'Check readiness' })).toBeDisabled()
  })

  it('keeps partial Record Paid results visible for Finance', async () => {
    storageMock.markPaymentSummaryPaid.mockResolvedValue({
      status: 'partial',
      message: 'Payment operation partially completed: 1 succeeded, 1 skipped, 0 failed.',
      summary: { success: 1, skipped: 1, failed: 0 },
      results: [
        {
          staffId: 10,
          staffName: 'Test Staff',
          paymentPeriod: '2026-08',
          status: 'skipped',
          message: 'The request changed after summary issue.',
        },
      ],
    })
    render(<PaymentSummaryPanel />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Record paid' }))[0])
    fireEvent.change(screen.getByLabelText('Bank reference'), { target: { value: 'BANK-001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record selected requests paid' }))

    expect(
      await screen.findByText(
        'Payment operation partially completed: 1 succeeded, 1 skipped, 0 failed.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('The request changed after summary issue.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry unpaid requests' })).toBeInTheDocument()
  })
})
