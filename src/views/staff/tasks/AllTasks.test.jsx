import { describe, expect, it } from 'vitest'
import { buildAllTaskStatsItems, buildAllTasksUrl } from './AllTasks'

describe('buildAllTaskStatsItems', () => {
  it('builds exactly four task summary cards without the total tasks card', () => {
    const items = buildAllTaskStatsItems([
      { statusText: 'Ongoing', staffCode: 'AZA' },
      { statusText: 'Overdue', staffCode: 'AZA' },
      { statusText: 'Overdue', staffCode: 'AZA' },
      { statusText: 'Overdue', staffCode: 'NBD' },
      { statusText: 'Completed (On time)', staffCode: 'NBD' },
      { statusText: 'Completed (On time)', staffCode: 'NBD' },
      { statusText: 'Completed but late by 1 day', staffCode: 'AZA' },
    ])

    expect(items).toHaveLength(4)
    expect(items.map((item) => item.key)).toEqual([
      'ongoing',
      'overdue',
      'top-overdue',
      'top-on-time',
    ])
    expect(items.find((item) => item.key === 'ongoing')).toMatchObject({
      value: '1',
      tone: 'info',
    })
    expect(items.find((item) => item.key === 'overdue')).toMatchObject({
      value: '3',
      tone: 'danger',
    })
    expect(items.find((item) => item.key === 'top-overdue')).toMatchObject({
      value: 'AZA',
      sublabel: '2 overdue',
      tone: 'danger',
    })
    expect(items.find((item) => item.key === 'top-on-time')).toMatchObject({
      value: 'NBD',
      sublabel: '2 on time',
      tone: 'success',
    })
  })

  it('uses neutral card tones when there is no overdue or on-time leader', () => {
    const items = buildAllTaskStatsItems([{ statusText: 'Ongoing', staffCode: 'AZA' }])

    expect(items.find((item) => item.key === 'overdue')).toMatchObject({
      value: '0',
      tone: 'secondary',
    })
    expect(items.find((item) => item.key === 'top-overdue')).toMatchObject({
      value: '-',
      sublabel: '0 overdue',
      tone: 'secondary',
    })
    expect(items.find((item) => item.key === 'top-on-time')).toMatchObject({
      value: '-',
      sublabel: '0 on time',
      tone: 'secondary',
    })
  })
})

describe('buildAllTasksUrl', () => {
  it('omits date params for all-time staff task loading', () => {
    expect(
      buildAllTasksUrl('https://example.test/', {
        preset: 'all',
        startDate: '',
        endDate: '',
      }),
    ).toBe('https://example.test/tasks')
  })

  it('uses start and end params for bounded staff task loading', () => {
    expect(
      buildAllTasksUrl('https://example.test/', {
        preset: 'custom',
        startDate: '2025-12-01',
        endDate: '2026-01-31',
      }),
    ).toBe('https://example.test/tasks?start=2025-12-01&end=2026-01-31')
  })
})
