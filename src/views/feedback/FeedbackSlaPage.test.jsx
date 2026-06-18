import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FeedbackSlaPage from './FeedbackSlaPage'
import { fetchMonthlyFeedbackSla } from './actionHandlers'

vi.mock('./actionHandlers', () => ({
  fetchMonthlyFeedbackSla: vi.fn(),
}))

vi.mock('../../components/navigation/ModuleNavStrip', () => ({
  default: ({ activeTab }) => <div data-testid="module-nav">{activeTab}</div>,
}))

vi.mock('./FeedbackSlaChart', () => ({
  default: ({ rows = [], loading = false, error = '', targetPercent }) => (
    <div data-testid="sla-chart">
      {loading ? 'Loading chart' : error || `target ${targetPercent} rows ${rows.length}`}
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FeedbackSlaPage', () => {
  it('renders the support navigation and full SLA chart with backend metrics', async () => {
    fetchMonthlyFeedbackSla.mockResolvedValue({
      status: 'success',
      target_percent: 85,
      months: [{ month: '2026-06', month_label: 'Jun 2026', reported_count: 1 }],
    })

    render(<FeedbackSlaPage />)

    expect(screen.getByTestId('module-nav')).toHaveTextContent('feedback-sla')
    await waitFor(() => {
      expect(screen.getByTestId('sla-chart')).toHaveTextContent('target 85 rows 1')
    })
  })

  it('passes loading, error, and empty states to the SLA chart', async () => {
    fetchMonthlyFeedbackSla.mockRejectedValueOnce(new Error('metrics failed'))

    const { unmount } = render(<FeedbackSlaPage />)

    expect(screen.getByTestId('sla-chart')).toHaveTextContent('Loading chart')
    await waitFor(() => {
      expect(screen.getByTestId('sla-chart')).toHaveTextContent('Unable to load feedback SLA.')
    })

    fetchMonthlyFeedbackSla.mockResolvedValueOnce({
      status: 'success',
      target_percent: 90,
      months: [],
    })

    unmount()
    render(<FeedbackSlaPage />)

    await waitFor(() => {
      expect(screen.getByTestId('sla-chart')).toHaveTextContent('target 90 rows 0')
    })
  })
})
