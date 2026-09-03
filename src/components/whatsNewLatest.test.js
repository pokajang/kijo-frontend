import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('loadLatestWhatsNew', () => {
  it('shares one request across simultaneous consumers', async () => {
    let resolveResponse
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { loadLatestWhatsNew } = await import('./whatsNewLatest')

    const first = loadLatestWhatsNew()
    const second = loadLatestWhatsNew()

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveResponse({ ok: true, json: () => Promise.resolve({ status: 'success' }) })
    await expect(first).resolves.toEqual({ ok: true, data: { status: 'success' } })
  })

  it('allows a later refresh after the shared request settles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { loadLatestWhatsNew } = await import('./whatsNewLatest')

    await loadLatestWhatsNew()
    await loadLatestWhatsNew()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
