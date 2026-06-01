import { describe, expect, it } from 'vitest'

import { buildProjectTableStats } from '../projectTableStats'

const getStat = (stats, key) => stats.find((item) => item.key === key)

describe('projectTableStats', () => {
  it('builds project overview stats from normalized rows', () => {
    const nowTime = Date.parse('2026-05-29T00:00:00Z')
    const stats = buildProjectTableStats(
      [
        {
          id: 1,
          status: 'Active',
          closed: '',
          update: '2026-05-20',
          owner: 'AL',
          value: 1000,
        },
        {
          id: 2,
          status: 'Active',
          closed: '',
          update: '',
          owner: 'AL',
          value: 500,
        },
        {
          id: 3,
          status: 'Terminated',
          closed: '2026-05-01',
          update: '2026-04-01',
          owner: 'BR',
          value: 200,
        },
        {
          id: 4,
          status: 'Completed',
          closed: '2026-05-15',
          update: '2026-05-15',
          owner: 'BR',
          value: 2000,
        },
      ],
      nowTime,
    )

    expect(getStat(stats, 'total-value')).toEqual(
      expect.objectContaining({
        label: 'Total Value',
        value: 'RM 3,500.00',
        sublabel: 'Excludes terminated: RM 200.00',
        tone: 'primary',
      }),
    )
    expect(getStat(stats, 'active')).toEqual(
      expect.objectContaining({
        label: 'Active',
        value: '2',
        tone: 'info',
      }),
    )
    expect(getStat(stats, 'needs-update')).toEqual(
      expect.objectContaining({
        label: 'Needs Update',
        value: '1',
        sublabel: '1 missing update',
        tone: 'warning',
      }),
    )
    expect(getStat(stats, 'top-leader')).toEqual(
      expect.objectContaining({
        label: 'Top Leader',
        value: 'BR',
        sublabel: 'RM 2,000.00 across 1 projects',
        tone: 'secondary',
      }),
    )
  })

  it('marks needs update as success when active projects are fresh', () => {
    const nowTime = Date.parse('2026-05-29T00:00:00Z')
    const stats = buildProjectTableStats(
      [
        {
          id: 1,
          status: 'Active',
          closed: '',
          update: '2026-05-28',
          owner: 'AL',
          value: 1000,
        },
      ],
      nowTime,
    )

    expect(getStat(stats, 'needs-update')).toEqual(
      expect.objectContaining({
        value: '0',
        sublabel: '0 missing update',
        tone: 'success',
      }),
    )
  })
})
