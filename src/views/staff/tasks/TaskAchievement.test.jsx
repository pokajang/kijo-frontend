import { describe, expect, it } from 'vitest'
import { getTaskAchievementCounts } from './TaskAchievement'

describe('getTaskAchievementCounts', () => {
  it('counts on-time and late completions for the selected year only', () => {
    const tasks = [
      {
        status: 'Completed',
        dueDate: '2026-05-20',
        completedAt: '2026-05-20',
      },
      {
        status: 'Completed',
        dueDate: '2026-05-19',
        completedAt: '2026-05-21',
      },
      {
        status: 'Completed',
        dueDate: '2025-12-30',
        completedAt: '2025-12-30',
      },
      {
        status: 'Ongoing',
        dueDate: '2026-05-01',
      },
    ]

    expect(getTaskAchievementCounts(tasks, '2026-05-21', 'year')).toEqual({
      onTimeCount: 1,
      lateCount: 1,
    })
    expect(getTaskAchievementCounts(tasks, '2026-05-21', 'all')).toEqual({
      onTimeCount: 2,
      lateCount: 1,
    })
  })

  it('does not classify completed records with missing dates as late', () => {
    const tasks = [
      {
        status: 'Completed',
        dueDate: '',
        completedAt: '',
      },
    ]

    expect(getTaskAchievementCounts(tasks, '2026-05-21', 'year')).toEqual({
      onTimeCount: 0,
      lateCount: 0,
    })
  })
})
