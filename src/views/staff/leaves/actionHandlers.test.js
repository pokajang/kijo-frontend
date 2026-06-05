import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAllLeavesPayload } from './actionHandlers'

describe('leave actionHandlers period loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('omits year for all-time leave records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'success',
          leaves: [{ id: 1 }],
          action_permissions: { can_recommend: true, can_approve: false },
        }),
      })),
    )

    await expect(
      getAllLeavesPayload({ preset: 'all', startDate: '', endDate: '' }),
    ).resolves.toEqual({
      leaves: [{ id: 1 }],
      actionPermissions: { canRecommend: true, canApprove: false },
    })

    expect(String(global.fetch.mock.calls[0][0])).not.toContain('year=')
  })

  it('fetches and merges every covered year for cross-year leave records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () => ({
          status: 'success',
          leaves: String(url).includes('year=2025')
            ? [{ id: 1 }, { id: 2 }]
            : [{ id: 2 }, { id: 3 }],
        }),
      })),
    )

    await expect(
      getAllLeavesPayload({
        preset: 'custom',
        startDate: '2025-12-01',
        endDate: '2026-01-31',
      }),
    ).resolves.toMatchObject({
      leaves: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })

    expect(global.fetch.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('year=2025'),
      expect.stringContaining('year=2026'),
    ])
  })

  it('surfaces API error messages for failed leave record requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ status: 'error', message: 'Not allowed' }),
      })),
    )

    await expect(getAllLeavesPayload({ preset: 'all' })).rejects.toThrow('Not allowed')
  })

  it('surfaces HTTP status when failed leave responses are not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })),
    )

    await expect(getAllLeavesPayload({ preset: 'all' })).rejects.toThrow(
      'Request failed with HTTP 500',
    )
  })
})
