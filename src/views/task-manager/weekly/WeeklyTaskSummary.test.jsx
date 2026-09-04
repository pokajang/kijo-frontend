import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WeeklyTaskSummary from './WeeklyTaskSummary'

const api = vi.hoisted(() => ({ getWeeklySummary: vi.fn() }))

vi.mock('./taskUpdateApi', () => ({ getWeeklySummary: api.getWeeklySummary }))

describe('WeeklyTaskSummary', () => {
  it('shows grouped summary items and opens their source task', async () => {
    api.getWeeklySummary.mockResolvedValueOnce({
      status: 'success',
      achievements: [
        {
          taskId: 42,
          taskTitle: 'Deploy application',
          staffCode: 'AZM',
          staffName: 'Azam Husain',
          events: [
            { type: 'progress', text: 'Front-end refactor completed.', activityDate: '2026-08-20' },
          ],
        },
      ],
      hiccups: [],
      nextWeek: [],
    })
    const onOpenTask = vi.fn()

    render(<WeeklyTaskSummary management onOpenTask={onOpenTask} />)

    expect(await screen.findByText('Deploy application')).toBeInTheDocument()
    expect(screen.getByText('No hiccups reported for this week.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Deploy application/i }))
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 42 }))
  })

  it('loads two weeks and renders a staff comparison with empty-week context', async () => {
    api.getWeeklySummary.mockReset()
    api.getWeeklySummary
      .mockResolvedValueOnce({
        status: 'success',
        achievements: [
          {
            taskId: 42,
            taskTitle: 'Deploy application',
            events: [{ type: 'progress', text: 'Draft prepared.', activityDate: '2026-08-31' }],
          },
        ],
        hiccups: [],
        nextWeek: [],
      })
      .mockResolvedValueOnce({
        status: 'success',
        achievements: [],
        hiccups: [
          {
            taskId: 42,
            taskTitle: 'Deploy application',
            events: [{ type: 'hiccup', text: 'Waiting on access.', activityDate: '2026-08-24' }],
          },
        ],
        nextWeek: [],
      })

    render(
      <WeeklyTaskSummary
        management
        staffOptions={[{ value: '42', label: 'AZM - Azam' }]}
        reviewState={{
          staffId: '42',
          weekStart: '2026-08-31',
          compareEnabled: true,
          compareWeekStart: '2026-08-24',
        }}
      />,
    )

    expect((await screen.findAllByText('Draft prepared.')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Waiting on access.').length).toBeGreaterThan(0)
    expect(api.getWeeklySummary).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Two week task comparison')).toBeInTheDocument()
  })

  it('starts a side-by-side view from the compact two-week control', async () => {
    api.getWeeklySummary.mockReset()
    api.getWeeklySummary.mockResolvedValue({
      status: 'success',
      achievements: [],
      hiccups: [],
      nextWeek: [],
    })
    const onReviewChange = vi.fn()

    render(
      <WeeklyTaskSummary
        management
        staffOptions={[{ value: '42', label: 'AZM - Azam' }]}
        reviewState={{
          staffId: '42',
          weekStart: '2026-08-31',
          compareEnabled: false,
          compareWeekStart: '2026-08-24',
        }}
        onReviewChange={onReviewChange}
      />,
    )

    const twoWeekButton = (await screen.findAllByRole('button', { name: '2 Week View' })).find(
      (button) => !button.disabled && button.getAttribute('aria-pressed') === 'false',
    )
    fireEvent.click(twoWeekButton)

    expect(onReviewChange).toHaveBeenCalledWith(
      expect.objectContaining({
        compareEnabled: true,
        compareWeekStart: '2026-08-24',
        weekStart: '2026-08-31',
      }),
    )
    expect(screen.queryByText('Compare weeks')).not.toBeInTheDocument()
  })

  it('explains why comparison is unavailable until management selects a staff member', async () => {
    api.getWeeklySummary.mockResolvedValue({
      status: 'success',
      achievements: [],
      hiccups: [],
      nextWeek: [],
    })

    render(
      <WeeklyTaskSummary management reviewState={{ staffId: 'all', weekStart: '2026-08-31' }} />,
    )

    expect(screen.getAllByText('Select one staff member to compare two weeks.')).not.toHaveLength(0)
    expect(
      screen.getAllByRole('button', { name: '2 Week View' }).some((button) => button.disabled),
    ).toBe(true)
  })
})
