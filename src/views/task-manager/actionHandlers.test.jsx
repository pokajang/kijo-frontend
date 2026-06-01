import { describe, expect, it } from 'vitest'

import { getDaysLapsedInfo, getStatusText } from './actionHandlers'

describe('task manager status helpers', () => {
  it('measures open duration from creation while keeping task ongoing before due date', () => {
    const task = {
      status: 'Ongoing',
      createdAt: '2026-05-01',
      dueDate: '2026-05-06',
    }

    expect(getStatusText(task, '2026-05-05')).toBe('Ongoing')
    expect(getDaysLapsedInfo(task, '2026-05-05')).toMatchObject({
      value: 4,
      display: '4 days',
      basis: 'Open duration',
    })
  })

  it('keeps a task ongoing on the due date', () => {
    const task = {
      status: 'Ongoing',
      createdAt: '2026-05-01',
      dueDate: '2026-05-06',
    }

    expect(getStatusText(task, '2026-05-06')).toBe('Ongoing')
    expect(getDaysLapsedInfo(task, '2026-05-06')).toMatchObject({
      value: 5,
      display: '5 days',
      basis: 'Open duration',
    })
  })

  it('shows active overdue tasks with lateness from the due date only', () => {
    const task = {
      status: 'Ongoing',
      createdAt: '2026-05-01',
      dueDate: '2026-05-06',
    }

    expect(getStatusText(task, '2026-05-07')).toBe('Overdue by 1 day')
    expect(getDaysLapsedInfo(task, '2026-05-07')).toMatchObject({
      value: 6,
      display: '6 days',
      basis: 'Open duration',
    })
  })

  it('stops duration at completion and shows completed late text from due date only', () => {
    const task = {
      status: 'Completed',
      createdAt: '2026-05-01',
      dueDate: '2026-05-06',
      completedAt: '2026-05-10',
    }

    expect(getStatusText(task, '2026-05-25')).toBe('Completed but late by 4 days')
    expect(getDaysLapsedInfo(task, '2026-05-25')).toMatchObject({
      value: 9,
      display: '9 days',
      basis: 'Completion duration',
    })
  })
})
