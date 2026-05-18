import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'

import store from '../store'
import AppHeader from '../components/AppHeader'
import WhatsNewNotifier from '../components/WhatsNewNotifier'

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { staff_id: 7, full_name: 'QA User' },
  }),
}))

vi.mock('../components/header/index', () => ({
  AppHeaderDropdown: () => <div data-testid="header-dropdown" />,
}))

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => payload,
})

describe('release UI behavior', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
  })

  it("shows What's New as a dismissible non-blocking notice without marking it read", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        status: 'success',
        data: {
          id: 42,
          title: 'Release notes',
          summary: 'A smaller update notice is ready.',
        },
        meta: { unread_count: 1 },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = render(
      <MemoryRouter>
        <main>Dashboard content remains visible</main>
        <WhatsNewNotifier />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('whats-new-notifier')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard content remains visible')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }))

    await waitFor(() => {
      expect(screen.queryByTestId('whats-new-notifier')).not.toBeInTheDocument()
    })
    expect(window.sessionStorage.getItem('kijo:whats-new:dismissed:7:42')).toBe('1')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/read'))).toBe(false)

    unmount()
    render(
      <MemoryRouter>
        <WhatsNewNotifier />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.queryByTestId('whats-new-notifier')).not.toBeInTheDocument()
  })

  it("does not show What's New when the latest notice is already read", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        status: 'success',
        data: {
          id: 43,
          title: 'Already read release notes',
          summary: 'This should stay quiet.',
          is_read: true,
        },
        meta: { unread_count: 0 },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <main>Dashboard content remains visible</main>
        <WhatsNewNotifier />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId('whats-new-notifier')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lets users dismiss the missing-signature warning for the current session', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url)

        if (path.includes('auth/session')) {
          return jsonResponse({
            status: 'success',
            user: { staff_id: 11, full_name: 'QA User', roles: ['Staff'] },
          })
        }

        if (path.includes('signature')) {
          return jsonResponse({ status: 'success', url: null })
        }

        return jsonResponse({ status: 'success', data: null, meta: { unread_count: 0 } })
      }),
    )

    render(
      <Provider store={store}>
        <MemoryRouter>
          <AppHeader />
        </MemoryRouter>
      </Provider>,
    )

    expect(await screen.findByText('Signature missing.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss signature warning' }))

    await waitFor(() => {
      expect(screen.queryByText('Signature missing.')).not.toBeInTheDocument()
    })
    expect(window.sessionStorage.getItem('kijo:signature-warning:dismissed:7')).toBe('1')
  })
})
