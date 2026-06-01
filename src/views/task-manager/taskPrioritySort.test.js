import { describe, expect, it } from 'vitest'

import { compareTaskPriority } from './taskPrioritySort'

const sortByTaskPriority = (rows) =>
  [...rows].sort((left, right) => compareTaskPriority(null, null, left, right))

describe('compareTaskPriority', () => {
  it('orders actionable tasks before completed tasks and uses due date urgency', () => {
    const rows = [
      {
        id: 1,
        statusText: 'Completed (On time)',
        statusRank: 3,
        dueDate: '2026-05-20',
        completedAt: '2026-05-24 09:00:00',
        createdAt: '2026-05-18 10:00:00',
      },
      {
        id: 2,
        statusText: 'Ongoing',
        statusRank: 2,
        dueDate: '2026-05-22',
        createdAt: '2026-05-15 10:00:00',
      },
      {
        id: 3,
        statusText: 'Overdue',
        statusRank: 1,
        dueDate: '2026-05-25',
        createdAt: '2026-05-15 10:00:00',
      },
      {
        id: 4,
        statusText: 'Overdue',
        statusRank: 1,
        dueDate: '2026-05-18',
        createdAt: '2026-05-11 10:00:00',
      },
    ]

    expect(sortByTaskPriority(rows).map((task) => task.id)).toEqual([4, 3, 2, 1])
  })

  it('orders completed tasks by latest completion date first', () => {
    const rows = [
      {
        id: 1,
        statusText: 'Completed (On time)',
        statusRank: 3,
        completedAt: '2026-05-20 09:00:00',
        createdAt: '2026-05-10 10:00:00',
      },
      {
        id: 2,
        statusText: 'Completed (On time)',
        statusRank: 3,
        completedAt: '2026-05-24 09:00:00',
        createdAt: '2026-05-12 10:00:00',
      },
      {
        id: 3,
        statusText: 'Completed but late by 1 day',
        statusRank: 4,
        completedAt: '2026-05-25 09:00:00',
        createdAt: '2026-05-13 10:00:00',
      },
    ]

    expect(sortByTaskPriority(rows).map((task) => task.id)).toEqual([2, 1, 3])
  })
})
