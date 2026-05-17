import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClientEvents, apiFetch, apiJson, getCsrfToken, setCsrfToken } from '../api/apiClient'

describe('apiClient', () => {
  afterEach(() => {
    setCsrfToken(null)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('passes clean Laravel fetch paths through and emits busy events', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const events = []

    vi.stubGlobal('fetch', fetchMock)
    window.addEventListener(apiClientEvents.name, (event) => events.push(event.detail))

    const apiBase = import.meta.env.VITE_API_BASE || '/'
    const response = await apiFetch(`${apiBase}tasks`, { credentials: 'include' })

    expect(response.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock.mock.calls[0][0]).not.toContain('getAllTasks.php')
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'busy', count: 1 }),
        expect.objectContaining({ type: 'busy', count: 0 }),
      ]),
    )
  })

  it('throws API messages from JSON error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Email is required.' }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiJson('/auth/login', { method: 'POST', silentError: true })).rejects.toThrow(
      'Email is required.',
    )
  })

  it('captures csrf tokens from JSON responses and attaches them to unsafe requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'success', csrf_token: 'csrf-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/auth/session', { credentials: 'include' })
    expect(getCsrfToken()).toBe('csrf-123')

    await apiFetch('/tasks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task' }),
    })

    const [, init] = fetchMock.mock.calls[1]
    expect(init.headers).toBeInstanceOf(Headers)
    expect(init.headers.get('X-CSRF-TOKEN')).toBe('csrf-123')
    expect(init.headers.get('Content-Type')).toBe('application/json')
  })

  it('refreshes csrf token and retries unsafe requests once after a 419', async () => {
    setCsrfToken('stale-csrf')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'error', message: 'CSRF token mismatch.' }), {
          status: 419,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'success', csrf_token: 'fresh-csrf' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    const response = await apiFetch('/stats/monthly-sales', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: '2026-01-01', end_date: '2026-05-15' }),
    })

    expect(response.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/proxy/auth/session')
    expect(getCsrfToken()).toBe('fresh-csrf')

    const [, firstInit] = fetchMock.mock.calls[0]
    const [, retryInit] = fetchMock.mock.calls[2]
    expect(firstInit.headers.get('X-CSRF-TOKEN')).toBe('stale-csrf')
    expect(retryInit.headers.get('X-CSRF-TOKEN')).toBe('fresh-csrf')
  })
})
