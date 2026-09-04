import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useNotificationList } from './useNotificationList'

const notification = (id) => ({ id, title: `Notification ${id}` })

describe('useNotificationList', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads subsequent notification pages without replacing the current items', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'success',
          data: {
            items: Array.from({ length: 20 }, (_, index) => notification(index + 1)),
            total: 25,
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'success',
          data: {
            items: Array.from({ length: 5 }, (_, index) => notification(index + 21)),
            total: 25,
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useNotificationList({ enabled: true }))

    await waitFor(() => expect(result.current.hasLoaded).toBe(true))
    expect(result.current.items).toHaveLength(20)
    expect(result.current.hasMore).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('notifications/list?limit=20&offset=0'),
      expect.any(Object),
    )

    act(() => result.current.loadMore())

    await waitFor(() => expect(result.current.items).toHaveLength(25))
    expect(result.current.hasMore).toBe(false)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('notifications/list?limit=20&offset=20'),
      expect.any(Object),
    )
  })
})
