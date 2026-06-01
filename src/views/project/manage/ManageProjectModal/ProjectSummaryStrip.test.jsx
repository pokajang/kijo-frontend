import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import ProjectSummaryStrip from './ProjectSummaryStrip'

describe('ProjectSummaryStrip', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders project summary fields', () => {
    render(
      <ProjectSummaryStrip
        project={{
          status: 'Active',
          project_type: 'Training',
          quote_value: 4500,
          award_date: '2026-03-13',
          assigned_staff: [
            { project_role: 'Leader', full_name: 'Azam Bin Husain', name_code: 'AZA' },
          ],
          progress_updates: [{ progress_date: '2026-03-20', progress_text: 'Updated' }],
        }}
      />,
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Training')).toBeInTheDocument()
    expect(screen.getByText('RM 4,500.00')).toBeInTheDocument()
    expect(screen.getByText('Azam Bin Husain (AZA)')).toBeInTheDocument()
    expect(screen.getByText('2026-03-13')).toBeInTheDocument()
    expect(screen.getByText('2026-03-20')).toBeInTheDocument()
  })

  it('handles missing project values', () => {
    render(<ProjectSummaryStrip project={{}} />)

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(1)
  })
})
