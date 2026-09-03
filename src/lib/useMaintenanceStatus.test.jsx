import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyAppUpdate } from './serviceWorkerRegistration'
import useMaintenanceStatus, { normalizeMaintenanceStatus } from './useMaintenanceStatus'

vi.mock('./serviceWorkerRegistration', () => ({
  applyAppUpdate: vi.fn(),
}))

const statusResponse = (maintenance) => ({
  ok: true,
  json: vi.fn().mockResolvedValue({ maintenance }),
})

describe('useMaintenanceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('normalizes only explicit boolean maintenance states', () => {
    expect(normalizeMaintenanceStatus({ maintenance: true })).toBe(true)
    expect(normalizeMaintenanceStatus({ maintenance: false })).toBe(false)
    expect(normalizeMaintenanceStatus({ maintenance: 'true' })).toBeNull()
    expect(normalizeMaintenanceStatus(null)).toBeNull()
  })

  it('shows maintenance after an explicit active response', async () => {
    fetch.mockResolvedValue(statusResponse(true))

    const { result } = renderHook(() => useMaintenanceStatus({ pollMs: 60000 }))

    await waitFor(() => expect(result.current.maintenanceActive).toBe(true))
    expect(fetch).toHaveBeenCalledWith('/maintenance-status.json', { cache: 'no-store' })
  })

  it('reloads exactly once when a seen maintenance window ends', async () => {
    fetch.mockResolvedValueOnce(statusResponse(true)).mockResolvedValueOnce(statusResponse(false))
    applyAppUpdate.mockResolvedValue()

    const { result } = renderHook(() => useMaintenanceStatus({ pollMs: 60000 }))
    await waitFor(() => expect(result.current.maintenanceActive).toBe(true))

    await act(async () => result.current.checkStatus())
    await act(async () => result.current.checkStatus())

    expect(applyAppUpdate).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not enter maintenance or reload after a network failure', async () => {
    fetch.mockRejectedValue(new TypeError('offline'))

    const { result } = renderHook(() => useMaintenanceStatus({ pollMs: 60000 }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(result.current.maintenanceActive).toBe(false)
    expect(applyAppUpdate).not.toHaveBeenCalled()
  })

  it('checks again when an existing tab receives focus', async () => {
    fetch.mockResolvedValue(statusResponse(false))

    renderHook(() => useMaintenanceStatus({ pollMs: 60000 }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    act(() => window.dispatchEvent(new Event('focus')))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('checks again when a visible tab resumes', async () => {
    fetch.mockResolvedValue(statusResponse(false))

    renderHook(() => useMaintenanceStatus({ pollMs: 60000 }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    act(() => document.dispatchEvent(new Event('visibilitychange')))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('cleans up its polling interval when unmounted', () => {
    fetch.mockResolvedValue(statusResponse(false))
    const intervalId = 1234
    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockReturnValue(intervalId)
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

    const { unmount } = renderHook(() => useMaintenanceStatus({ pollMs: 60000 }))
    unmount()

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId)
  })
})
