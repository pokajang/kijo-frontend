import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FirstTouchTimeline from '../components/FirstTouchTimeline'

afterEach(cleanup)

describe('First Touch relationship timeline', () => {
  it('shows factual project and staff context in table rows', () => {
    render(
      <FirstTouchTimeline
        entries={[
          {
            id: 'origin',
            date: '2021-01-01',
            title: 'First documented encounter',
            context: 'Website enquiry',
            staffName: 'Nurul Najwa',
            staffCode: 'NND',
            staffRole: 'Handled by',
          },
          {
            id: 'project',
            date: '2022-01-01',
            title: 'Project awarded',
            context: 'Alpha Project',
            staffName: 'Daniel Lee',
            staffRole: 'Sales owner',
          },
        ]}
      />,
    )

    expect(screen.getAllByText('Website enquiry')).not.toHaveLength(0)
    expect(screen.getAllByText('Alpha Project')).not.toHaveLength(0)
    expect(screen.getAllByText('Handled by: Nurul Najwa (NND)')).not.toHaveLength(0)
    expect(screen.getAllByText('Sales owner: Daniel Lee')).not.toHaveLength(0)
  })

  it('keeps long timelines compact until earlier events are requested', () => {
    render(
      <FirstTouchTimeline
        entries={[
          { id: 'first', date: '2021-01-01', title: 'First touch' },
          { id: 'second', date: '2022-01-01', title: 'Second' },
          { id: 'third', date: '2023-01-01', title: 'Third' },
          { id: 'fourth', date: '2024-01-01', title: 'Fourth' },
          { id: 'fifth', date: '2025-01-01', title: 'Fifth' },
        ]}
      />,
    )

    expect(screen.getAllByText('First touch')).not.toHaveLength(0)
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 earlier event' }))
    expect(screen.getAllByText('Second')).not.toHaveLength(0)
  })
})
