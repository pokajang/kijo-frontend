import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackPage from './FeedbackPage'
import { fetchAllFeedbacks, fetchMonthlyFeedbackSla, fetchSessionInfo } from './actionHandlers'

const testState = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { staff_id: 10, roles: ['System Admin'] },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => testState.navigate,
  }
})

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: testState.user, status: 'authenticated' }),
}))

vi.mock('./actionHandlers', () => ({
  fetchSessionInfo: vi.fn(),
  fetchAllFeedbacks: vi.fn(),
  fetchMonthlyFeedbackSla: vi.fn(),
  updateFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
}))

vi.mock('./FeedbackTable', () => ({
  default: ({ allFeedbacks = [], loading = false }) => (
    <div data-testid="feedback-table">
      {loading ? 'Loading table' : allFeedbacks.map((row) => row.feedback).join(', ')}
    </div>
  ),
}))

vi.mock('./FeedbackSlaChart', () => ({
  default: ({ error = '', loading = false, rows = [], targetPercent }) => (
    <div data-testid="sla-chart">
      {loading ? 'Loading SLA' : error || `target ${targetPercent} rows ${rows.length}`}
    </div>
  ),
}))

vi.mock('./AdminFixModal', () => ({
  default: () => null,
  STATUS_OPTIONS: ['Pending', 'Fixed Pending Pushed', 'In Progress', 'Fixed Completed', 'Resolved'],
  RESOLUTION_TRACK_OPTIONS: [
    'Needs Triage',
    '30-Day Fix',
    'Next Upgrade',
    'Roadmap / Backlog',
    'Not Actionable',
    'Rejected',
  ],
}))

vi.mock('../../components/navigation/ModuleNavStrip', () => ({
  default: () => null,
}))

vi.mock('../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../components/toast/toastService', () => ({
  showToast: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  testState.user = { staff_id: 10, roles: ['System Admin'] }
  fetchSessionInfo.mockResolvedValue({ isAdmin: true, staffId: 10 })
  fetchAllFeedbacks.mockResolvedValue([
    {
      id: 1,
      feedback: 'Ticket table still loads',
      status: 'Pending',
      reported_by_id: 10,
    },
  ])
})

describe('FeedbackPage', () => {
  it('passes backend SLA target and rows into the chart', async () => {
    fetchMonthlyFeedbackSla.mockResolvedValue({
      status: 'success',
      target_percent: 85,
      months: [
        {
          month: '2026-06',
          month_label: 'Jun 2026',
          reported_count: 1,
          eligible_count: 1,
          completed_count: 1,
          fixed_under_30_count: 1,
          missed_30_count: 0,
          open_within_window_count: 0,
          sla_percent: 100,
          is_final: true,
        },
      ],
    })

    render(<FeedbackPage />)

    await waitFor(() => {
      expect(screen.getByTestId('sla-chart')).toHaveTextContent('target 85 rows 1')
    })
  })

  it('keeps the feedback table available when SLA metrics fail', async () => {
    fetchMonthlyFeedbackSla.mockRejectedValue(new Error('metrics failed'))

    render(<FeedbackPage />)

    await waitFor(() => {
      expect(screen.getByTestId('feedback-table')).toHaveTextContent('Ticket table still loads')
    })

    expect(screen.getByTestId('sla-chart')).toHaveTextContent('Unable to load feedback SLA.')
  })
})
