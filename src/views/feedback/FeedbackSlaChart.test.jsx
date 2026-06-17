import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import FeedbackSlaChart from './FeedbackSlaChart'

vi.mock('@coreui/react-chartjs', () => ({
  CChartBar: ({ data, plugins = [] }) => (
    <div role="img" aria-label="Feedback SLA chart">
      {(data?.labels || []).join(', ')}
      {' | '}
      {(data?.datasets || []).map((dataset) => dataset.label).join(', ')}
      {' | values '}
      {(data?.datasets?.[0]?.data || []).join(', ')}
      {' | labels '}
      {(data?.datasets?.[0]?.valueLabels || []).join(', ')}
      {' | plugins '}
      {plugins.map((plugin) => plugin.id).join(', ')}
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('FeedbackSlaChart', () => {
  const rows = [
    {
      month: '2026-05',
      month_label: 'May 2026',
      reported_count: 2,
      eligible_count: 1,
      completed_count: 1,
      fixed_under_30_count: 1,
      missed_30_count: 0,
      open_within_window_count: 1,
      sla_percent: 100,
      is_final: false,
    },
    {
      month: '2026-04',
      month_label: 'Apr 2026',
      reported_count: 2,
      eligible_count: 2,
      completed_count: 1,
      fixed_under_30_count: 0,
      missed_30_count: 2,
      open_within_window_count: 0,
      sla_percent: 0,
      is_final: true,
    },
    {
      month: '2026-06',
      month_label: 'Jun 2026',
      reported_count: 1,
      eligible_count: 0,
      completed_count: 0,
      fixed_under_30_count: 0,
      missed_30_count: 0,
      open_within_window_count: 1,
      sla_percent: null,
      is_final: false,
    },
  ]

  it('renders monthly SLA bars without a target line', () => {
    render(<FeedbackSlaChart rows={rows} year={2026} targetPercent={85} />)

    expect(screen.getByText('30-Day Feedback SLA')).toBeInTheDocument()
    expect(screen.getByText('Target: 85%')).toBeInTheDocument()
    expect(screen.getByText('Green >= target')).toBeInTheDocument()
    expect(screen.getByText('Amber below target')).toBeInTheDocument()
    expect(screen.getByText('Gray provisional')).toBeInTheDocument()

    const chart = screen.getByRole('img', { name: 'Feedback SLA chart' })
    expect(chart).toHaveTextContent('May 2026, Apr 2026, Jun 2026')
    expect(chart).toHaveTextContent('Fixed <=30d SLA')
    expect(chart).toHaveTextContent('values 100, 0, 2')
    expect(chart).toHaveTextContent('labels 100.0%, 0.0%, Pending')
    expect(chart).not.toHaveTextContent('90% target')
    expect(chart).toHaveTextContent('feedbackSlaValueLabels')
    expect(screen.getAllByText('100.0%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0.0%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('accepts a full 12-month year without dropping labels', () => {
    const fullYearRows = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0')
      return {
        month: `2026-${month}`,
        month_label: `M${month} 2026`,
        reported_count: 1,
        eligible_count: 1,
        completed_count: 1,
        fixed_under_30_count: 1,
        missed_30_count: 0,
        open_within_window_count: 0,
        sla_percent: 100,
        is_final: true,
      }
    })

    render(<FeedbackSlaChart rows={fullYearRows} year={2026} targetPercent={90} />)

    const chart = screen.getByRole('img', { name: 'Feedback SLA chart' })
    expect(chart).toHaveTextContent('M01 2026')
    expect(chart).toHaveTextContent('M12 2026')
  })

  it('renders loading, error, and empty states', () => {
    const { rerender } = render(<FeedbackSlaChart loading year={2026} />)
    expect(screen.getByText('Loading feedback SLA...')).toBeInTheDocument()

    rerender(<FeedbackSlaChart error="Unable to load feedback SLA." year={2026} />)
    expect(screen.getByText('Unable to load feedback SLA.')).toBeInTheDocument()

    rerender(<FeedbackSlaChart rows={[]} year={2026} />)
    expect(screen.getByText('No feedback SLA data available.')).toBeInTheDocument()
  })
})
