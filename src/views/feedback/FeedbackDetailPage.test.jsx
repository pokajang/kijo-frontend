import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackDetailPage from './FeedbackDetailPage'
import { fetchFeedback, verifyFeedback } from './actionHandlers'

const mocks = vi.hoisted(() => ({
  consumeEntity: vi.fn().mockResolvedValue(1),
  confirm: vi.fn().mockResolvedValue(true),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ feedbackId: '7' }),
    useNavigate: () => mocks.navigate,
    useLocation: () => ({ pathname: '/support/feedback/7', state: null }),
  }
})

vi.mock('./actionHandlers', () => ({
  fetchFeedback: vi.fn(),
  postFeedbackComment: vi.fn(),
  updateFeedback: vi.fn(),
  verifyFeedback: vi.fn(),
}))

vi.mock('../../notifications/AppNotificationProvider', () => ({
  useAppNotifications: () => ({ consumeEntity: mocks.consumeEntity }),
}))

vi.mock('../../components/dialog/dialogService', () => ({
  default: { alert: vi.fn(), confirm: mocks.confirm },
}))

vi.mock('../../components/toast/toastService', () => ({ showToast: vi.fn() }))

vi.mock('../../components/datatable', () => ({
  DataTableDetailShell: ({ children, actions = [] }) => (
    <div>
      {actions
        .filter((action) => !action.hidden)
        .map((action) => (
          <button key={action.key} type="button" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      {children}
    </div>
  ),
  DataTableDetailFields: ({ fields }) => (
    <div>
      {fields.map((field) => (
        <div key={field.key}>{field.value}</div>
      ))}
    </div>
  ),
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

vi.mock('./AdminFixModal', () => ({
  default: () => null,
  STATUS_OPTIONS: ['Pending', 'Fixed Pending Pushed', 'In Progress', 'Fixed Completed'],
  RESOLUTION_TRACK_OPTIONS: ['Needs Triage', '30-Day Fix'],
}))

const detailPayload = () => ({
  status: 'success',
  feedback: {
    id: 7,
    feedback: 'Mobile export is empty',
    reported_by: 'REP',
    date_reported: '2026-08-01',
    status: 'Fixed Completed',
    resolution_track: '30-Day Fix',
  },
  history: [
    {
      id: 1,
      event_type: 'report_received',
      actor_name: 'REP',
      created_at: '2026-08-01 09:00:00',
      changes: {},
    },
  ],
  permissions: { can_comment: true, can_update_fix: false, can_verify: true, can_edit: true },
})

beforeEach(() => {
  fetchFeedback.mockResolvedValue(detailPayload())
  verifyFeedback.mockResolvedValue({
    ...detailPayload(),
    feedback: { ...detailPayload().feedback, status: 'In Progress' },
    permissions: { ...detailPayload().permissions, can_verify: false },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FeedbackDetailPage workflow', () => {
  it('loads the direct detail, consumes its notification, and shows reporter controls', async () => {
    render(<FeedbackDetailPage />)

    expect(await screen.findByText('Report received')).toBeInTheDocument()
    expect(fetchFeedback).toHaveBeenCalledWith('7')
    expect(mocks.consumeEntity).toHaveBeenCalledWith(
      expect.objectContaining({ moduleKey: 'support.feedback', entityId: '7' }),
    )
    expect(screen.getByRole('button', { name: 'Confirm Resolved' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject Fix' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('uses the comment text as the required rejection reason', async () => {
    render(<FeedbackDetailPage />)
    const comment = await screen.findByPlaceholderText(/explain why the fix should be rejected/i)
    fireEvent.change(comment, { target: { value: 'Still broken on mobile' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reject Fix' }))

    await waitFor(() => {
      expect(verifyFeedback).toHaveBeenCalledWith('7', 'reject', 'Still broken on mobile')
    })
  })
})
