import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useVersionCheck from './useVersionCheck'

const serviceWorkerMocks = vi.hoisted(() => ({
  applyAppUpdate: vi.fn(),
  getAppServiceWorkerRegistration: vi.fn().mockResolvedValue(null),
}))

vi.mock('./serviceWorkerRegistration', () => serviceWorkerMocks)

const versionResponse = () => ({
  ok: true,
  json: async () => ({ version: 'version-1' }),
})

describe('useVersionCheck polling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceWorkerMocks.getAppServiceWorkerRegistration.mockResolvedValue(null)
    window.localStorage.setItem('app_version', 'version-1')
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('coalesces focus and visibility checks while a version request is running', async () => {
    let resolveRequest
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useVersionCheck())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    act(() => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => resolveRequest(versionResponse()))
  })

  it('does not run its interval check while the document is hidden', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const fetchMock = vi.fn().mockResolvedValue(versionResponse())
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useVersionCheck())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [intervalCallback] = setIntervalSpy.mock.calls[0]
    act(() => intervalCallback())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
