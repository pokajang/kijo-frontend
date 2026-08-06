import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FeedbackActivityTimeline from './FeedbackActivityTimeline'

afterEach(cleanup)

describe('FeedbackActivityTimeline', () => {
  it('renders immutable events in the order supplied by the API', () => {
    render(
      <FeedbackActivityTimeline
        history={[
          {
            id: 1,
            event_type: 'report_received',
            actor_name: 'REP',
            created_at: '2026-08-01 09:00:00',
            changes: {},
          },
          {
            id: 2,
            event_type: 'developer_updated',
            actor_name: 'ADM',
            created_at: '2026-08-02 09:00:00',
            message: 'Accepted for the current sprint.',
            changes: { status: { from: 'Pending', to: 'In Progress' } },
          },
        ]}
      />,
    )

    const timeline = screen.getByTestId('feedback-activity-timeline')
    expect(timeline).toHaveTextContent('Report received')
    expect(timeline).toHaveTextContent('Developer updated triage')
    expect(timeline).toHaveTextContent('Pending → In Progress')
    expect(timeline.textContent.indexOf('Report received')).toBeLessThan(
      timeline.textContent.indexOf('Developer updated triage'),
    )
  })
})
