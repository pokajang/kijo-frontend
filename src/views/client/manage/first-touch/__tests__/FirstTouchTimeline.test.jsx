import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FirstTouchTimeline from '../components/FirstTouchTimeline'

const entries = [
  {
    id: 'quote-1',
    date: '2024-01-15',
    kind: 'quotation_created',
    title: 'Quotation created',
    context: 'Q-001 · ISO Audit',
    staff: [{ name: 'Nurul Najwa', code: 'NND', role: 'Created by' }],
  },
  {
    id: 'follow-up-1',
    date: '2024-01-18',
    kind: 'follow_up_recorded',
    title: 'Follow-up recorded',
    context: 'Q-001 · ISO Audit',
    remarks: 'Client will review next week.',
    staff: [{ name: 'Nurul Najwa', code: 'NND', role: 'Recorded by' }],
  },
  {
    id: 'project-1',
    date: '2024-02-04',
    kind: 'project_awarded',
    title: 'Project awarded',
    context: 'ISO Internal Audit',
    staff: [
      { name: 'Azam Husain', code: 'AZA', role: 'Leader' },
      { name: 'Fakhri Azizi', code: 'FKR', role: 'Assistant' },
    ],
  },
]

describe('FirstTouchTimeline', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows chronological activity with explicit staff roles', () => {
    render(<FirstTouchTimeline entries={entries} />)

    expect(screen.getAllByText('Quotation created')).not.toHaveLength(0)
    expect(screen.getAllByText(/Leader: Azam Husain \(AZA\)/)).not.toHaveLength(0)
    expect(screen.getAllByText(/Recorded by: Nurul Najwa \(NND\)/)).not.toHaveLength(0)
  })

  it('filters the same chronological timeline without grouping by project', () => {
    render(<FirstTouchTimeline entries={entries} />)

    fireEvent.change(screen.getByLabelText('Filter relationship activity'), {
      target: { value: 'follow_up' },
    })

    expect(screen.getAllByText('Follow-up recorded')).not.toHaveLength(0)
    expect(screen.queryAllByText('Project awarded')).toHaveLength(0)
  })
})
