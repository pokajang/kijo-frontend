import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDetailJson } from './detailPages'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('fetchDetailJson', () => {
  it('returns successful JSON payloads with the normalized wrapper', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'success', data: { id: 1 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(fetchDetailJson('/api/records/1')).resolves.toEqual({
      ok: true,
      status: 200,
      data: { status: 'success', data: { id: 1 } },
    })
  })

  it('maps 404 responses to a quiet notFound result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Missing record' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchDetailJson('/api/records/1')

    expect(result).toEqual({
      ok: false,
      notFound: true,
      status: 404,
      data: { message: 'Missing record' },
      message: 'Missing record',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/records/1',
      expect.objectContaining({ credentials: 'include', silentError: true }),
    )
  })

  it('throws unexpected failures with status metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Server exploded' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(fetchDetailJson('/api/records/1')).rejects.toMatchObject({
      message: 'Server exploded',
      status: 500,
      notFound: false,
    })
  })

  it('preserves abort errors instead of treating them as expected not found', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('aborted by test')))

    await expect(
      fetchDetailJson('/api/records/1', { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
