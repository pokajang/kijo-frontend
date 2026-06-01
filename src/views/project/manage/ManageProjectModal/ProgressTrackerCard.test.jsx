import React from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProgressTrackerCard from './ProgressTrackerCard'
import { listProjectProgress } from '../projectApi'

vi.mock('../projectApi', () => ({
  deleteProjectProgress: vi.fn(),
  listProjectProgress: vi.fn(),
  saveProjectProgress: vi.fn(),
}))

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

describe('ProgressTrackerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProjectProgress.mockResolvedValue([
      {
        id: 1,
        progress_date: '2026-05-26',
        progress_text: 'Previous update',
        updated_on: '2026-05-26 10:05:24',
        updated_by: 'AZA',
      },
      {
        id: 2,
        progress_date: '2026-05-29',
        progress_text: 'Project Alpha assigned with task',
        updated_on: '2026-05-29 09:00:13',
        updated_by: 'AZA',
        source_type: 'task',
      },
    ])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders compact logged, delta, cumulative, count, and task marker values', async () => {
    render(<ProgressTrackerCard projectId={12} projectName="Project Alpha" />)

    await waitFor(() => expect(screen.getAllByText('2026-05-29').length).toBeGreaterThan(0))

    expect(screen.getByText('(2)')).toBeInTheDocument()
    expect(screen.getByText('09:00:13')).toBeInTheDocument()
    expect(screen.getByText('+3d')).toBeInTheDocument()
    expect(screen.getByText('Cum. 3d')).toBeInTheDocument()
    expect(screen.getByText('Task')).toBeInTheDocument()
  })

  it('keeps task-linked edit and delete actions disabled', async () => {
    render(<ProgressTrackerCard projectId={12} projectName="Project Alpha" />)

    await waitFor(() => expect(screen.getByText('Task')).toBeInTheDocument())

    const taskRow = screen.getByText('Task').closest('tr')
    const buttons = within(taskRow).getAllByRole('button')
    buttons[0].click()

    expect(screen.getAllByText('Edit')[0]).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByText('Delete')[0]).toHaveAttribute('aria-disabled', 'true')
  })
})
