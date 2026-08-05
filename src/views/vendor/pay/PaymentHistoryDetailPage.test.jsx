import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentHistoryDetailPage from './PaymentHistoryDetailPage'

const mocks = vi.hoisted(() => ({
  findRecord: vi.fn(),
  consumeEntity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../components/datatable', () => ({
  DataTableDetailShell: ({ children }) => <div>{children}</div>,
  DataTableDetailFields: ({ fields = [] }) => (
    <div>
      {fields.map((field) => (
        <div key={field.key}>
          <span>{field.label}</span>
          <div>{field.value}</div>
        </div>
      ))}
    </div>
  ),
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

vi.mock('../../../utils/detailPages', () => ({
  findRecordByPagedEndpoint: mocks.findRecord,
  sameId: (left, right) => String(left) === String(right),
}))

vi.mock('../../../utils/assetUrls', () => ({
  resolveAssetUrl: () => '',
}))

vi.mock('../../../notifications/AppNotificationProvider', () => ({
  useAppNotifications: () => ({ consumeEntity: mocks.consumeEntity }),
}))

const payment = {
  id: 42,
  status: 'Pending',
  amount: 125,
  created_at: '2026-08-05 09:00:00',
  created_by_name_code: 'REQ',
  vendor_name: 'Vendor A',
  payment_context: 'Office',
  payment_type: 'Deposit',
  method: 'Online Transfer',
  workflow_flow: {
    currentStage: { key: 'review.1', label: 'Review' },
    stages: [
      {
        key: 'review.1',
        stageType: 'review',
        label: 'Review',
        state: 'current',
        status: 'Pending',
        recipients: [{ staffId: 10, fullName: 'Review User', nameCode: 'REV' }],
      },
      {
        key: 'approval.1',
        stageType: 'approval',
        label: 'Approval',
        state: 'waiting',
        status: 'Waiting',
        recipients: [{ staffId: 20, fullName: 'Approve User', nameCode: 'APP' }],
      },
      {
        key: 'finance.1',
        stageType: 'finance',
        label: 'Finance',
        state: 'waiting',
        status: 'Waiting',
        recipients: [{ staffId: 30, fullName: 'Finance User', nameCode: 'FIN' }],
      },
    ],
  },
}

describe('PaymentHistoryDetailPage', () => {
  beforeEach(() => {
    mocks.findRecord.mockResolvedValue(payment)
    mocks.consumeEntity.mockClear()
  })

  it('shows the current stage and complete configured workflow', async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/vendor/payment-records/42', state: { record: payment } }]}
      >
        <Routes>
          <Route path="/vendor/payment-records/:paymentId" element={<PaymentHistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Current Stage')).toBeInTheDocument()
    expect(screen.getAllByText('Review')).toHaveLength(2)
    expect(screen.getByText('Review User (REV)')).toBeInTheDocument()
    expect(screen.getByText('Approve User (APP)')).toBeInTheDocument()
    expect(screen.getByText('Finance User (FIN)')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Vendor payment workflow' })).toBeInTheDocument()
    expect(screen.getByText('Date Reviewed')).toBeInTheDocument()
    expect(screen.getByText('Reviewed By')).toBeInTheDocument()
    expect(screen.getByText('Review Remarks')).toBeInTheDocument()
    await waitFor(() => expect(mocks.findRecord).toHaveBeenCalled())
  })
})
