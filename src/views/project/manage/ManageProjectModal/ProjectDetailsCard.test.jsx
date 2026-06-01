import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProjectDetailsCard from './ProjectDetailsCard'

vi.mock('../projectApi', () => ({
  reloadProjectPoNumber: vi.fn(),
  updateProjectDetails: vi.fn(),
}))

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

const baseProject = {
  id: 12,
  project_name: 'Safety Induction Video Production',
  po_loa_number: 'LOA-001',
  project_type: 'Special Service',
  award_date: '2026-03-13 23:28:22',
  service_start_date: '2026-03-14T08:00:00Z',
  service_end_date: '2026-03-15',
  status: 'Active',
  description: 'Project description',
}

describe('ProjectDetailsCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders read-only dates through shared date formatting and project status as a badge', () => {
    render(<ProjectDetailsCard project={baseProject} />)

    expect(screen.getByText('2026-03-13')).toBeInTheDocument()
    expect(screen.getByText('2026-03-14')).toBeInTheDocument()
    expect(screen.getByText('2026-03-15')).toBeInTheDocument()
    expect(screen.getByText('Active')).toHaveClass('badge')
  })

  it('renders missing read-only dates with the shared fallback', () => {
    render(
      <ProjectDetailsCard
        project={{
          ...baseProject,
          award_date: '',
          service_start_date: null,
          service_end_date: undefined,
        }}
      />,
    )

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3)
  })

  it('keeps edit-mode date inputs on raw project values', () => {
    const editableProject = {
      ...baseProject,
      award_date: '2026-03-13',
      service_start_date: '2026-03-14',
      service_end_date: '2026-03-15',
    }

    render(<ProjectDetailsCard project={editableProject} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Award Date')).toHaveValue('2026-03-13')
    expect(screen.getByLabelText('Service Start Date')).toHaveValue('2026-03-14')
    expect(screen.getByLabelText('Service End Date')).toHaveValue('2026-03-15')
  })
})
