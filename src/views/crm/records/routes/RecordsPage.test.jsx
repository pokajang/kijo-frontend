import React, { useEffect } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RecordsPage from './RecordsPage'
import { useRecordsController } from '../hooks/useRecordsController'

vi.mock('../hooks/useRecordsController', () => ({
  useRecordsController: vi.fn(),
}))

vi.mock('../../../../components/records/RecordsServiceStrip.jsx', () => ({
  default: ({ tabs = [], activeTab, onTabChange }) => (
    <div aria-label="Quotation record groups">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.key}
          aria-pressed={tab.key === activeTab}
          onClick={() => onTabChange?.(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../modals/shared/EmailSendConfirmModal.jsx', () => ({
  default: () => null,
}))

vi.mock('../modals/shared/NegotiationRequestModal.jsx', () => ({
  default: () => null,
}))

vi.mock('../modals/shared/QuoteApprovalReviewModal.jsx', () => ({
  default: () => null,
}))

const EmptyModal = () => null

const makeReportingTable = (scopeLabel) => {
  const ReportingTable = ({
    onStatsScopeLabelChange,
    statsVisible = true,
    controlsVisible = true,
  }) => {
    useEffect(() => {
      onStatsScopeLabelChange?.(scopeLabel)
    }, [onStatsScopeLabelChange])

    return (
      <div>
        {statsVisible ? <div data-testid="crm-stats-row">Stats row</div> : null}
        {controlsVisible ? <div data-testid="crm-search-row">Search row</div> : null}
        <div>Records table</div>
      </div>
    )
  }

  return ReportingTable
}

const mockController = (overrides = {}) => ({
  activeTab: 'all-tab',
  handleTabChange: vi.fn(),
  recordTabOptions: [
    { key: 'all-tab', label: 'All', slug: '' },
    { key: 'training-tab', label: 'Training', slug: 'training' },
  ],
  ActiveTableComponent: makeReportingTable('1 Jan 2026 - 30 May 2026'),
  tableProps: {},
  FailModal: EmptyModal,
  SuccessModal: EmptyModal,
  FollowUpModalComponent: EmptyModal,
  modalState: {
    fail: { visible: false, reason: '' },
    success: {
      visible: false,
      reason: '',
      awardDate: '',
      description: '',
      clientLoaRefNo: '',
      actionType: '',
    },
    followUp: { visible: false, remarks: '', date: '' },
  },
  dispatchModal: vi.fn(),
  handleFailConfirm: vi.fn(),
  handleSuccessConfirm: vi.fn(),
  handleFollowUpSubmit: vi.fn(),
  currentUserName: '',
  currentUserEmail: '',
  currentUser: null,
  emailConfirmRecord: null,
  setEmailConfirmRecord: vi.fn(),
  emailDraftSubject: '',
  setEmailDraftSubject: vi.fn(),
  emailDraftBody: '',
  setEmailDraftBody: vi.fn(),
  emailSendError: '',
  handleEmailPreviewPdf: vi.fn(),
  handleEmailOpenGmailDraft: vi.fn(),
  handleEmailConfirm: vi.fn(),
  isEmailSending: false,
  isFailModalSubmitting: false,
  isSuccessModalSubmitting: false,
  isFollowUpModalSubmitting: false,
  successRecord: null,
  negotiationRecord: null,
  negotiationForm: {},
  setNegotiationFormValue: vi.fn(),
  closeNegotiationModal: vi.fn(),
  handleNegotiationSubmit: vi.fn(),
  isNegotiationSubmitting: false,
  ...overrides,
})

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <RecordsPage />
      <LocationProbe />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.clearAllMocks()
})

describe('RecordsPage', () => {
  it('shows pending quotation approvals and opens the review from the same page', () => {
    const openApprovalReview = vi.fn()
    const approval = { id: 9, quote_ref_no: 'QTR-009' }
    useRecordsController.mockReturnValue(
      mockController({ pendingApprovals: [approval], openApprovalReview }),
    )

    renderPage()

    expect(screen.getByText(/1 quotation requires your approval/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Review Now' }))
    expect(openApprovalReview).toHaveBeenCalledWith(approval)
  })

  it('opens a queued approval review when multiple approvals are pending', () => {
    const openApprovalReview = vi.fn()
    const approvals = [
      { id: 9, quote_ref_no: 'QTR-009' },
      { id: 10, quote_ref_no: 'QTR-010' },
    ]
    useRecordsController.mockReturnValue(
      mockController({ pendingApprovals: approvals, openApprovalReview }),
    )

    renderPage()

    expect(screen.getByText(/2 quotations require your approval/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Review Now' }))
    expect(openApprovalReview).toHaveBeenCalledWith(approvals[0], { queue: approvals })
  })

  it('renders the active all-table scope label in the card header', async () => {
    useRecordsController.mockReturnValue(mockController())

    renderPage()

    expect(await screen.findByText('1 Jan 2026 - 30 May 2026')).toBeInTheDocument()
    expect(screen.getByText('1 Jan 2026 - 30 May 2026')).toHaveClass(
      'data-table-card-header__scope',
    )
  })

  it('renders the active service-table scope label in the card header', async () => {
    useRecordsController.mockReturnValue(
      mockController({
        activeTab: 'training-tab',
        ActiveTableComponent: makeReportingTable('1 Jan 2026 - 30 May 2026'),
      }),
    )

    renderPage()

    expect(await screen.findByText('1 Jan 2026 - 30 May 2026')).toHaveClass(
      'data-table-card-header__scope',
    )
  })

  it('toggles the active table stats row', async () => {
    useRecordsController.mockReturnValue(mockController())

    renderPage()

    expect(await screen.findByTestId('crm-stats-row')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(screen.queryByTestId('crm-stats-row')).not.toBeInTheDocument()
    expect(screen.getByText('Records table')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(screen.getByTestId('crm-stats-row')).toBeInTheDocument()
  })

  it('toggles the active table search row', async () => {
    useRecordsController.mockReturnValue(mockController())

    renderPage()

    expect(await screen.findByTestId('crm-search-row')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show search and filters row' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(screen.queryByTestId('crm-search-row')).not.toBeInTheDocument()
    expect(screen.getByTestId('crm-stats-row')).toBeInTheDocument()
    expect(screen.getByText('Records table')).toBeInTheDocument()
  })

  it('carries the selected custom category into quotation creation', () => {
    useRecordsController.mockReturnValue(
      mockController({
        activeTab: 'special-tab',
        activeCategoryId: 34,
        activeNavigationTab: 'special-category:34',
        recordTabOptions: [
          { key: 'special-tab', label: 'Special Service' },
          { key: 'special-category:34', label: 'Environment' },
        ],
      }),
    )

    renderPage()
    expect(screen.getByRole('button', { name: 'Environment' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create Quotation' }))
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/crm/quotes?service=special&categoryId=34',
    )
  })
})
