import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import useDataTableStatsVisibility, {
  DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY,
  DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY,
  DATA_TABLE_STATS_SYSTEMWIDE_API_KEY,
  DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY,
  buildDataTableControlsVisibilityApiKey,
  buildDataTableControlsVisibilityStorageKey,
  buildDataTableStatsVisibilityApiKey,
  buildDataTableStatsVisibilityStorageKey,
} from './useDataTableStatsVisibility'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useDataTableStatsVisibility', () => {
  const renderStatsHook = (storageKey, defaultVisible = true, options = {}) =>
    renderHook(() =>
      useDataTableStatsVisibility(storageKey, defaultVisible, { apiBase: '', ...options }),
    )

  const getPreferenceKeyFromUrl = (url) =>
    decodeURIComponent(String(url).split('/staff/preferences/').at(-1))

  const stubPreferenceFetch = ({
    pageFound = false,
    pageVisible = true,
    systemFound = false,
    systemVisible = true,
    controlsPageFound = false,
    controlsPageVisible = true,
    controlsSystemFound = false,
    controlsSystemVisible = true,
  } = {}) => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      const method = options.method || 'GET'
      const key = getPreferenceKeyFromUrl(url)

      if (method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: { key, value: JSON.parse(options.body).value },
          }),
        }
      }

      if (key === DATA_TABLE_STATS_SYSTEMWIDE_API_KEY) {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: { key, found: systemFound, value: { visible: systemVisible } },
          }),
        }
      }

      if (key === DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY) {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              key,
              found: controlsSystemFound,
              value: { visible: controlsSystemVisible },
            },
          }),
        }
      }

      if (key.startsWith('datatable-controls-visible.')) {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              key,
              found: controlsPageFound,
              value: { visible: controlsPageVisible },
            },
          }),
        }
      }

      return {
        ok: true,
        json: async () => ({
          status: 'success',
          data: { key, found: pageFound, value: { visible: pageVisible } },
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('defaults stats to visible', () => {
    const { result } = renderStatsHook('test.default')

    expect(result.current.statsVisible).toBe(true)
  })

  it('defaults controls to visible', () => {
    const { result } = renderStatsHook('test.controls.default')

    expect(result.current.controlsVisible).toBe(true)
  })

  it('persists hidden and visible states', () => {
    const key = buildDataTableStatsVisibilityStorageKey('test.persist')
    const { result } = renderStatsHook('test.persist')

    act(() => result.current.toggleStatsVisible('page'))

    expect(result.current.statsVisible).toBe(false)
    expect(window.localStorage.getItem(key)).toBe('false')

    act(() => result.current.toggleStatsVisible('page'))

    expect(result.current.statsVisible).toBe(true)
    expect(window.localStorage.getItem(key)).toBe('true')
  })

  it('uses a systemwide preference as the fallback for every table', () => {
    window.localStorage.setItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, 'false')

    const { result } = renderStatsHook('test.systemwide')

    expect(result.current.statsVisible).toBe(false)
  })

  it('falls back to the default value for corrupt systemwide storage', () => {
    window.localStorage.setItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, '{bad-json')

    const { result } = renderStatsHook('test.systemwide.corrupt')

    expect(result.current.statsVisible).toBe(true)
  })

  it('allows a page preference to override the systemwide preference', () => {
    const key = buildDataTableStatsVisibilityStorageKey('test.override')
    window.localStorage.setItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, 'false')
    window.localStorage.setItem(key, 'true')

    const { result } = renderStatsHook('test.override')

    expect(result.current.statsVisible).toBe(true)
  })

  it('clears page overrides when applying a systemwide preference', () => {
    const firstKey = buildDataTableStatsVisibilityStorageKey('test.first')
    const secondKey = buildDataTableStatsVisibilityStorageKey('test.second')
    window.localStorage.setItem(firstKey, 'false')
    window.localStorage.setItem(secondKey, 'false')

    const { result } = renderStatsHook('test.first')

    act(() => result.current.toggleStatsVisible('systemwide'))

    expect(result.current.statsVisible).toBe(true)
    expect(window.localStorage.getItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY)).toBe('true')
    expect(window.localStorage.getItem(firstKey)).toBeNull()
    expect(window.localStorage.getItem(secondKey)).toBeNull()
  })

  it('updates other mounted tables when applying a systemwide preference', () => {
    const first = renderStatsHook('test.mounted.first')
    const second = renderStatsHook('test.mounted.second')

    act(() => first.result.current.toggleStatsVisible('systemwide'))

    expect(first.result.current.statsVisible).toBe(false)
    expect(second.result.current.statsVisible).toBe(false)
  })

  it('refreshes mounted tables when a systemwide storage event arrives', () => {
    const { result } = renderStatsHook('test.storage.systemwide')

    act(() => {
      window.localStorage.setItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, 'false')
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY,
          newValue: 'false',
        }),
      )
    })

    expect(result.current.statsVisible).toBe(false)
  })

  it('refreshes the current table when its page storage event arrives', () => {
    const key = buildDataTableStatsVisibilityStorageKey('test.storage.page')
    const { result } = renderStatsHook('test.storage.page')

    act(() => {
      window.localStorage.setItem(key, 'false')
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: 'false',
        }),
      )
    })

    expect(result.current.statsVisible).toBe(false)
  })

  it('keeps page-only changes scoped to the current table', () => {
    const first = renderStatsHook('test.page.first')
    const second = renderStatsHook('test.page.second')

    act(() => first.result.current.toggleStatsVisible('page'))

    expect(first.result.current.statsVisible).toBe(false)
    expect(second.result.current.statsVisible).toBe(true)
  })

  it('falls back to the default value for corrupt storage', () => {
    const key = buildDataTableStatsVisibilityStorageKey('test.corrupt')
    window.localStorage.setItem(key, '{bad-json')

    const { result } = renderStatsHook('test.corrupt', true)

    expect(result.current.statsVisible).toBe(true)
  })

  it('loads a page preference from the backend', async () => {
    stubPreferenceFetch({ pageFound: true, pageVisible: false })

    const { result } = renderStatsHook('test.backend.page', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(result.current.statsVisible).toBe(false))
    expect(
      window.localStorage.getItem(buildDataTableStatsVisibilityStorageKey('test.backend.page')),
    ).toBe('false')
  })

  it('loads a controls page preference from the backend', async () => {
    stubPreferenceFetch({ controlsPageFound: true, controlsPageVisible: false })

    const { result } = renderStatsHook('test.controls.backend.page', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(result.current.controlsVisible).toBe(false))
    expect(
      window.localStorage.getItem(
        buildDataTableControlsVisibilityStorageKey('test.controls.backend.page'),
      ),
    ).toBe('false')
  })

  it('falls back to a backend systemwide preference', async () => {
    stubPreferenceFetch({ systemFound: true, systemVisible: false })

    const { result } = renderStatsHook('test.backend.systemwide', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(result.current.statsVisible).toBe(false))
    expect(window.localStorage.getItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY)).toBe('false')
  })

  it('falls back to a backend controls systemwide preference', async () => {
    stubPreferenceFetch({ controlsSystemFound: true, controlsSystemVisible: false })

    const { result } = renderStatsHook('test.controls.backend.systemwide', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(result.current.controlsVisible).toBe(false))
    expect(window.localStorage.getItem(DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY)).toBe('false')
  })

  it('lets a backend page preference override a backend systemwide preference', async () => {
    window.localStorage.setItem(DATA_TABLE_STATS_SYSTEMWIDE_STORAGE_KEY, 'false')
    stubPreferenceFetch({
      pageFound: true,
      pageVisible: true,
      systemFound: true,
      systemVisible: false,
    })

    const { result } = renderStatsHook('test.backend.override', false, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(result.current.statsVisible).toBe(true))
  })

  it('lets a backend controls page preference override a backend controls systemwide preference', async () => {
    window.localStorage.setItem(DATA_TABLE_CONTROLS_SYSTEMWIDE_STORAGE_KEY, 'false')
    stubPreferenceFetch({
      controlsPageFound: true,
      controlsPageVisible: true,
      controlsSystemFound: true,
      controlsSystemVisible: false,
    })

    const { result } = renderStatsHook('test.controls.backend.override', false, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(result.current.controlsVisible).toBe(true))
  })

  it('sends a page preference update to the backend', async () => {
    const fetchMock = stubPreferenceFetch()
    const apiKey = buildDataTableStatsVisibilityApiKey('test.backend.put')
    const { result } = renderStatsHook('test.backend.put', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fetchMock.mockClear()

    act(() => result.current.toggleStatsVisible('page'))

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.test/staff/preferences/${encodeURIComponent(apiKey)}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ value: { visible: false } }),
      }),
    )
  })

  it('sends a controls page preference update to the backend', async () => {
    const fetchMock = stubPreferenceFetch()
    const apiKey = buildDataTableControlsVisibilityApiKey('test.controls.backend.put')
    const { result } = renderStatsHook('test.controls.backend.put', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fetchMock.mockClear()

    act(() => result.current.toggleControlsVisible('page'))

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.test/staff/preferences/${encodeURIComponent(apiKey)}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ value: { visible: false } }),
      }),
    )
  })

  it('sends a systemwide preference update and refreshes mounted tables', async () => {
    const fetchMock = stubPreferenceFetch()
    const first = renderStatsHook('test.backend.system.first', true, {
      apiBase: 'https://api.test/',
    })
    const second = renderStatsHook('test.backend.system.second', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8))
    fetchMock.mockClear()

    act(() => first.result.current.toggleStatsVisible('systemwide'))

    expect(first.result.current.statsVisible).toBe(false)
    expect(second.result.current.statsVisible).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.test/staff/preferences/${encodeURIComponent(DATA_TABLE_STATS_SYSTEMWIDE_API_KEY)}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ value: { visible: false } }),
      }),
    )
  })

  it('sends a controls systemwide preference update and refreshes mounted tables', async () => {
    const fetchMock = stubPreferenceFetch()
    const first = renderStatsHook('test.controls.backend.system.first', true, {
      apiBase: 'https://api.test/',
    })
    const second = renderStatsHook('test.controls.backend.system.second', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8))
    fetchMock.mockClear()

    act(() => first.result.current.toggleControlsVisible('systemwide'))

    expect(first.result.current.controlsVisible).toBe(false)
    expect(second.result.current.controlsVisible).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.test/staff/preferences/${encodeURIComponent(DATA_TABLE_CONTROLS_SYSTEMWIDE_API_KEY)}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ value: { visible: false } }),
      }),
    )
  })

  it('keeps local persistence when backend sync fails', async () => {
    const key = buildDataTableStatsVisibilityStorageKey('test.backend.failure')
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderStatsHook('test.backend.failure', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))

    act(() => result.current.toggleStatsVisible('page'))

    expect(result.current.statsVisible).toBe(false)
    expect(window.localStorage.getItem(key)).toBe('false')
  })

  it('keeps controls local persistence when backend sync fails', async () => {
    const key = buildDataTableControlsVisibilityStorageKey('test.controls.backend.failure')
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderStatsHook('test.controls.backend.failure', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))

    act(() => result.current.toggleControlsVisible('page'))

    expect(result.current.controlsVisible).toBe(false)
    expect(window.localStorage.getItem(key)).toBe('false')
  })

  it('does not let stale backend hydration overwrite a local toggle', async () => {
    const resolveFetches = []
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetches.push(() =>
            resolve({
              ok: true,
              json: async () => ({
                status: 'success',
                data: { found: true, value: { visible: true } },
              }),
            }),
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderStatsHook('test.backend.race', true, {
      apiBase: 'https://api.test/',
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))

    act(() => result.current.toggleStatsVisible('page'))
    expect(result.current.statsVisible).toBe(false)

    await act(async () => {
      resolveFetches.forEach((resolveFetch) => resolveFetch())
      await Promise.resolve()
    })

    expect(result.current.statsVisible).toBe(false)
  })
})
