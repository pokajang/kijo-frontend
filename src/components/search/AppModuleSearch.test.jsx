import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import AppModuleSearch from './AppModuleSearch'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { staff_id: 7, roles: ['System Admin', 'HR'] },
  }),
}))

const renderSearch = () =>
  render(
    <MemoryRouter>
      <AppModuleSearch />
    </MemoryRouter>,
  )

const installLocalStorageMock = () => {
  const store = new Map()
  const storage = {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  }

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  })
}

describe('AppModuleSearch', () => {
  beforeEach(() => {
    installLocalStorageMock()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.localStorage.removeItem('kijo:module-search:recent:v1')
  })

  it('renders the desktop module search input', () => {
    renderSearch()

    expect(screen.getByRole('combobox', { name: 'Search modules' })).toBeInTheDocument()
  })

  it('opens results while typing and navigates with keyboard selection', async () => {
    renderSearch()

    const input = screen.getByRole('combobox', { name: 'Search modules' })
    fireEvent.change(input, { target: { value: 'leave' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/staff/leaves')
    })
  })

  it('records selections and shows recent results on empty focus', async () => {
    renderSearch()

    const input = screen.getByRole('combobox', { name: 'Search modules' })
    fireEvent.change(input, { target: { value: 'invoice' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Commercial, Invoice' }))

    fireEvent.focus(input)

    expect(await screen.findByText('Recent')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Commercial, Invoice' })).toBeInTheDocument()
  })

  it('shows and applies did-you-mean suggestions', async () => {
    renderSearch()

    const input = screen.getByRole('combobox', { name: 'Search modules' })
    fireEvent.change(input, { target: { value: 'invioce' } })

    const suggestion = await screen.findByRole('button', { name: 'Did you mean "invoice"?' })
    fireEvent.click(suggestion)

    await waitFor(() => {
      expect(input).toHaveValue('invoice')
    })
    expect(await screen.findByRole('option', { name: 'Commercial, Invoice' })).toBeInTheDocument()
  })

  it('navigates to action destinations', async () => {
    renderSearch()

    const input = screen.getByRole('combobox', { name: 'Search modules' })
    fireEvent.change(input, { target: { value: 'create task' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/task-manager?action=create')
    })
  })

  it('closes results on Escape', async () => {
    renderSearch()

    const input = screen.getByRole('combobox', { name: 'Search modules' })
    fireEvent.change(input, { target: { value: 'invoice' } })

    expect(await screen.findByRole('option', { name: 'Commercial, Invoice' })).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: 'Commercial, Invoice' })).not.toBeInTheDocument()
    })
  })

  it('opens the mobile search modal from the floating button', async () => {
    renderSearch()

    fireEvent.click(screen.getByRole('button', { name: 'Search modules' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Search Modules')).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Search modules' })).toBeInTheDocument()
  })

  it('can hide the mobile floating trigger', () => {
    render(
      <MemoryRouter>
        <AppModuleSearch showMobileTrigger={false} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Search modules' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
