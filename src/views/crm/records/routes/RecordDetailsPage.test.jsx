import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import RecordDetailsPage from './RecordDetailsPage'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/useRecordDetailsData', () => ({
  getStatusColor: () => 'secondary',
  useRecordDetailsData: () => ({
    serviceTab: 'training-tab',
    serviceConfig: { label: 'Training' },
    returnTo: '/crm/records',
    loading: false,
    record: { id: 11, status: 'pending' },
    error: '',
    loadRecord: vi.fn(),
    amountDisplay: 'RM 1,000.00',
    subject: 'Working at Height',
    quotationAgeDays: 1,
    isAwarded: false,
  }),
}))

vi.mock('../hooks/useRecordDetailsActions', () => ({
  useRecordDetailsActions: () => ({
    handlers: {},
  }),
}))

vi.mock('../details/RecordDetailsCard', () => ({
  default: () => <div>Quotation overview</div>,
}))

vi.mock('../details/service/RecordServiceDetails', () => ({
  default: () => <h2>Service quotation details</h2>,
}))

vi.mock('../details/RecordProposalInlineDetails', () => ({
  default: () => <h2>Proposal</h2>,
}))

vi.mock('../details/RecordActivityDetails', () => ({
  default: () => <h2>Status &amp; Follow-up History</h2>,
}))

vi.mock('../details/RecordDetailsActions', () => ({
  default: () => <h2>Actions</h2>,
}))

vi.mock('../modals/shared/ChangeToFailModal.jsx', () => ({ default: () => null }))
vi.mock('../modals/shared/ChangeToSuccessModal.jsx', () => ({ default: () => null }))
vi.mock('../modals/shared/EmailSendConfirmModal.jsx', () => ({ default: () => null }))
vi.mock('../modals/shared/FollowUpModal.jsx', () => ({ default: () => null }))

const expectDocumentOrder = (elements) => {
  elements.slice(0, -1).forEach((element, index) => {
    expect(
      element.compareDocumentPosition(elements[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
}

afterEach(cleanup)

describe('RecordDetailsPage', () => {
  it('keeps quotation content ahead of operational history and actions', () => {
    render(<RecordDetailsPage />)

    expectDocumentOrder([
      screen.getByRole('heading', { name: 'Service quotation details' }),
      screen.getByRole('heading', { name: 'Proposal' }),
      screen.getByRole('heading', { name: 'Status & Follow-up History' }),
      screen.getByRole('heading', { name: 'Actions' }),
    ])
  })
})
