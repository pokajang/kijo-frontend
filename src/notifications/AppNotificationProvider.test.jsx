import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppNotificationProvider, { useAppNotifications } from './AppNotificationProvider'
import { dispatchAppNotificationsChanged } from './appNotificationEvents'

const Consumer = () => {
  const { getRouteGroupCount, getTabCount, getModuleCount } = useAppNotifications()

  return (
    <div>
      <span data-testid="route">{getRouteGroupCount('/staff/leaves')}</span>
      <span data-testid="tab">{getTabCount('staff.leaves')}</span>
      <span data-testid="module">{getModuleCount('staff.leaves')}</span>
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AppNotificationProvider', () => {
  it('fetches summary counts and exposes route, tab, and module helpers', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        data: {
          total: 2,
          by_module: { 'staff.leaves': 2 },
          by_route_group: { '/staff/leaves': 2 },
          by_tab: { 'staff.leaves': 2 },
        },
      }),
    })

    render(
      <AppNotificationProvider>
        <Consumer />
      </AppNotificationProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('2'))
    expect(screen.getByTestId('tab')).toHaveTextContent('2')
    expect(screen.getByTestId('module')).toHaveTextContent('2')
  })

  it('refreshes when app notifications change', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 'success',
          data: {
            total: 0,
            by_module: {},
            by_route_group: {},
            by_tab: {},
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 'success',
          data: {
            total: 1,
            by_module: { 'staff.leaves': 1 },
            by_route_group: { '/staff/leaves': 1 },
            by_tab: { 'staff.leaves': 1 },
          },
        }),
      })

    render(
      <AppNotificationProvider>
        <Consumer />
      </AppNotificationProvider>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    dispatchAppNotificationsChanged()

    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('1'))
  })

  it('keeps the last-known counts when a refresh fails', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 'success',
          data: {
            total: 2,
            by_module: { 'staff.leaves': 2 },
            by_route_group: { '/staff/leaves': 2 },
            by_tab: { 'staff.leaves': 2 },
          },
        }),
      })
      .mockRejectedValueOnce(new Error('network down'))

    render(
      <AppNotificationProvider>
        <Consumer />
      </AppNotificationProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('2'))

    dispatchAppNotificationsChanged()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    // Transient failure must not blank the badges — last-known values persist.
    expect(screen.getByTestId('route')).toHaveTextContent('2')
    expect(screen.getByTestId('tab')).toHaveTextContent('2')
    expect(screen.getByTestId('module')).toHaveTextContent('2')
  })
})
