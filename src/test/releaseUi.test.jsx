import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Provider, useDispatch, useSelector } from 'react-redux'

import store from '../store'
import AppHeader from '../components/AppHeader'
import AppHeaderDropdown from '../components/header/AppHeaderDropdown'
import AppNotificationsDropdown from '../components/header/AppNotificationsDropdown'
import WhatsNewNotifier from '../components/WhatsNewNotifier'
import { RightDrawerProvider, useRightDrawer } from '../components/right-drawer/RightDrawerContext'
import { SidebarRightDrawerCoordinator } from '../layout/DefaultLayout'
import { KnowledgePanelProvider } from '../views/knowledge/KnowledgePanelContext'
import KnowledgeSidePanel from '../views/knowledge/KnowledgeSidePanel'
import AppNotificationProvider from '../notifications/AppNotificationProvider'

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { staff_id: 7, full_name: 'QA User' },
  }),
}))

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => payload,
})

const LocationPathDisplay = () => {
  const { pathname } = useLocation()
  return <div data-testid="route-path">{pathname}</div>
}

const DrawerSidebarCoordinatorHarness = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { activeDrawerId, closeRightDrawer, openRightDrawer } = useRightDrawer()

  return (
    <>
      <SidebarRightDrawerCoordinator />
      <button type="button" onClick={() => openRightDrawer('test-drawer')}>
        Open right drawer
      </button>
      <button type="button" onClick={() => closeRightDrawer('test-drawer')}>
        Close right drawer
      </button>
      <button type="button" onClick={() => dispatch({ type: 'set', sidebarShow: true })}>
        Open sidebar
      </button>
      <span data-testid="sidebar-state">{String(sidebarShow)}</span>
      <span data-testid="drawer-state">{activeDrawerId || 'none'}</span>
    </>
  )
}

describe('release UI behavior', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    store.dispatch({ type: 'set', sidebarShow: true })
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

  it("keeps What's New background fetch failures out of the console", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <WhatsNewNotifier />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(consoleError).not.toHaveBeenCalled()
    expect(screen.queryByTestId('whats-new-notifier')).not.toBeInTheDocument()
  })

  it('renders five mobile nav actions and hides Theme/News/Ticket in the bottom bar', () => {
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
      vi.fn(async () => jsonResponse({ status: 'success', data: null, meta: { unread_count: 0 } })),
    )

    render(
      <Provider store={store}>
        <MemoryRouter>
          <AppHeader />
        </MemoryRouter>
      </Provider>,
    )

    const menuButton = screen.getByRole('button', { name: 'Toggle menu' })
    const homeLink = screen.getByRole('link', { name: 'Home' })
    const tasksLink = screen.getByRole('link', { name: 'Tasks' })
    const alertsButton = screen.getByRole('button', { name: 'Notifications' })
    const accountButton = screen.getByRole('button', { name: 'Account' })
    const themeButton = screen.getByRole('button', { name: /switch to (dark|light) mode/i })
    const whatsNewLink = screen.getByRole('link', { name: "What's New" })
    const ticketButton = screen.getByRole('button', { name: 'Open support ticket' })

    expect(menuButton).toBeInTheDocument()
    expect(homeLink).toBeInTheDocument()
    expect(tasksLink).toBeInTheDocument()
    expect(alertsButton).toBeInTheDocument()
    expect(accountButton).toBeInTheDocument()

    expect(themeButton.closest('.app-bottom-nav-entry')).toHaveClass('d-none')
    expect(whatsNewLink.closest('.app-bottom-nav-entry')).toHaveClass('d-none')
    expect(ticketButton.closest('.app-bottom-nav-entry')).toHaveClass('d-none')

    const mobileVisibleEntries = Array.from(
      document.querySelectorAll('.app-bottom-nav-item, .app-bottom-nav-entry'),
    ).filter((entry) => !entry.classList.contains('d-none'))
    expect(mobileVisibleEntries).toHaveLength(5)
  })

  it('keeps desktop header actions direct in nav (theme, news, ticket)', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: true,
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
      vi.fn(async () => jsonResponse({ status: 'success', data: null, meta: { unread_count: 0 } })),
    )

    render(
      <Provider store={store}>
        <MemoryRouter>
          <AppHeader />
        </MemoryRouter>
      </Provider>,
    )

    expect(screen.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' }).closest('.app-bottom-nav-entry')).toHaveClass(
      'd-md-none',
    )
    expect(screen.getByRole('link', { name: "What's New" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open support ticket' })).toBeInTheDocument()
  })

  it('opens the Knowledge panel from the header Help button on touch activation', async () => {
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
      vi.fn(async () => jsonResponse({ status: 'success', data: [], meta: { unread_count: 0 } })),
    )

    render(
      <Provider store={store}>
        <MemoryRouter>
          <RightDrawerProvider>
            <KnowledgePanelProvider>
              <AppHeader />
              <KnowledgeSidePanel />
            </KnowledgePanelProvider>
          </RightDrawerProvider>
        </MemoryRouter>
      </Provider>,
    )

    const helpButton = screen.getByRole('button', { name: 'Open Knowledge help' })
    fireEvent.pointerDown(helpButton, { pointerType: 'touch' })

    expect(await screen.findByRole('button', { name: 'Close Knowledge panel' })).toBeInTheDocument()
    expect(screen.getByText('Learn')).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Close Knowledge help' }), {
      pointerType: 'touch',
    })

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Close Knowledge panel' }),
      ).not.toBeInTheDocument()
    })
  })

  it('keeps sidebar and right drawers mutually exclusive', async () => {
    store.dispatch({ type: 'set', sidebarShow: true })

    render(
      <Provider store={store}>
        <RightDrawerProvider>
          <DrawerSidebarCoordinatorHarness />
        </RightDrawerProvider>
      </Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open right drawer' }))

    await waitFor(() => {
      expect(screen.getByTestId('drawer-state')).toHaveTextContent('test-drawer')
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close right drawer' }))

    await waitFor(() => {
      expect(screen.getByTestId('drawer-state')).toHaveTextContent('none')
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open right drawer' }))

    await waitFor(() => {
      expect(screen.getByTestId('drawer-state')).toHaveTextContent('test-drawer')
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar' }))

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true')
      expect(screen.getByTestId('drawer-state')).toHaveTextContent('none')
    })
  })

  it("opens account utility actions for Theme, What's New, and Submit Ticket", async () => {
    const onToggleTheme = vi.fn()
    const onOpenTicket = vi.fn()
    const onAccountActiveChange = vi.fn()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <LocationPathDisplay />
        <AppHeaderDropdown
          sessionUser={{ full_name: 'QA User', roles: ['Staff'] }}
          onOpenTicket={onOpenTicket}
          onToggleTheme={onToggleTheme}
          onAccountActiveChange={onAccountActiveChange}
          themeToggleLabel="Switch to light mode"
          whatsNewLabel="What's New, 1 unread update"
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(onAccountActiveChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByText('Utilities')).toHaveClass('app-header-dropdown-heading')
    expect(screen.getByText('Utilities').closest('.app-header-dropdown-section')).toHaveClass(
      'd-md-none',
    )

    fireEvent.click(
      screen.getByText('Theme', { selector: '.app-header-dropdown-item-label' }).parentElement,
    )
    await waitFor(() => {
      expect(onToggleTheme).toHaveBeenCalledTimes(1)
      expect(onAccountActiveChange).toHaveBeenLastCalledWith(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(
      screen.getByText("What's New", { selector: '.app-header-dropdown-item-label' }).parentElement,
    )
    await waitFor(() => {
      expect(screen.getByTestId('route-path')).toHaveTextContent('/whats-new')
    })
    expect(onAccountActiveChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(
      screen.getByText('Submit Ticket', { selector: '.app-header-dropdown-item-label' })
        .parentElement,
    )
    await waitFor(() => {
      expect(onOpenTicket).toHaveBeenCalledTimes(1)
      expect(onAccountActiveChange).toHaveBeenLastCalledWith(false)
    })
  })

  it('keeps Alerts with unread badge visible and opens the notification list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url)

        if (path.includes('notifications/summary')) {
          return jsonResponse({
            status: 'success',
            data: { listable_total: 2, total: 2, by_module: {}, by_route_group: {}, by_tab: {} },
          })
        }

        if (path.includes('notifications/list')) {
          return jsonResponse({
            status: 'success',
            data: {
              items: [
                {
                  id: 1,
                  title: 'Sales Update',
                  message: 'Your sales report is ready.',
                },
              ],
            },
          })
        }

        return jsonResponse({ status: 'success', data: null, meta: {} })
      }),
    )

    render(
      <MemoryRouter>
        <AppNotificationProvider>
          <AppNotificationsDropdown />
        </AppNotificationProvider>
      </MemoryRouter>,
    )

    const alertsButton = await screen.findByRole('button', { name: /2 unread notifications/i })
    fireEvent.click(alertsButton)

    expect(await screen.findByText('Sales Update')).toBeInTheDocument()
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
