import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadActivitiesForPeriod } from './Activities'

describe('loadActivitiesForPeriod', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses all-time backend params and fetches every page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const textUrl = String(url)
        return {
          ok: true,
          json: async () => ({
            activities: textUrl.includes('page=2') ? [{ id: 2 }] : [{ id: 1 }],
            pagination: { last_page: 2 },
          }),
        }
      }),
    )

    await expect(
      loadActivitiesForPeriod('https://example.test/', {
        preset: 'all',
        startDate: '',
        endDate: '',
      }),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }])

    expect(global.fetch.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('periodFilter=all'),
      expect.stringContaining('page=2'),
    ])
    expect(global.fetch.mock.calls[0][0]).toContain('per_page=500')
  })
})
