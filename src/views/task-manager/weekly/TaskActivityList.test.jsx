import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TaskActivityList from './TaskActivityList'

const api = vi.hoisted(() => ({ listTaskUpdates: vi.fn() }))

vi.mock('./taskUpdateApi', () => ({ listTaskUpdates: api.listTaskUpdates }))

describe('TaskActivityList', () => {
  it('shows progress, carry-forward, and generated task events', async () => {
    api.listTaskUpdates.mockResolvedValueOnce({
      status: 'success',
      updates: [
        {
          id: 2,
          type: 'carry_forward',
          reportingWeekStart: '2026-08-17',
          previousDueDate: '2026-08-21',
          newDueDate: '2026-08-28',
          createdAt: '2026-08-21 10:00:00',
        },
        {
          id: 1,
          type: 'progress',
          reportingWeekStart: '2026-08-17',
          note: 'Front-end refactor completed.',
          createdAt: '2026-08-20 10:00:00',
        },
      ],
    })

    render(
      <TaskActivityList task={{ id: 42, createdAt: '2026-08-17', completedAt: '2026-08-28' }} />,
    )

    expect(await screen.findByText('Front-end refactor completed.')).toBeInTheDocument()
    expect(screen.getByText(/Due date changed from/)).toBeInTheDocument()
    expect(screen.getByText('Task completed.')).toBeInTheDocument()
  })
})
